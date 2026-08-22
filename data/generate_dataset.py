"""
RecoverAI - Synthetic Payment Dataset Generator (Python / Pandas / NumPy)
Generates realistic payment streams, failure categorizations, and recovery signals.
"""

import json
import random
import os
from datetime import datetime, timedelta

MERCHANTS = [
    {"id": "mch_saas_cloud", "name": "CloudScale SaaS India", "category": "B2B Software"},
    {"id": "mch_edtech_pro", "name": "LearnFlow EdTech", "category": "Education"},
    {"id": "mch_ecom_luxe", "name": "NovaStore Retail", "category": "E-Commerce"},
    {"id": "mch_fin_stream", "name": "WealthPulse Premium", "category": "FinTech Subscriptions"},
]

FAILURE_REASONS = [
    {
        "category": "INSUFFICIENT_FUNDS",
        "code": "BAD_REQUEST_INSUFFICIENT_FUNDS",
        "reason": "Account balance insufficient to complete debit",
        "method": "AUTO_DEBIT",
        "recoverability": 0.82,
        "strategy": "SMART_RETRY_OFFPEAK",
        "weight": 0.32,
    },
    {
        "category": "BANK_DOWNTIME",
        "code": "GATEWAY_ERROR_ISSUER_DOWN",
        "reason": "Issuer bank switch unavailable or timing out",
        "method": "NETBANKING",
        "recoverability": 0.89,
        "strategy": "METHOD_SWITCH_UPI",
        "weight": 0.22,
    },
    {
        "category": "EXPIRED_CARD",
        "code": "CARD_ERROR_EXPIRED",
        "reason": "Card validity date has lapsed or card replaced",
        "method": "CARD_CREDIT",
        "recoverability": 0.74,
        "strategy": "ONE_CLICK_MANDATE_UPDATE",
        "weight": 0.14,
    },
    {
        "category": "AUTHENTICATION_DROP",
        "code": "AUTH_ERROR_OTP_TIMEOUT",
        "reason": "Customer did not enter 3D Secure OTP in time",
        "method": "CARD_DEBIT",
        "recoverability": 0.68,
        "strategy": "PAYMENT_LINK_SMS",
        "weight": 0.16,
    },
    {
        "category": "CUSTOMER_ABANDONMENT",
        "code": "CHECKOUT_USER_DROPOUT",
        "reason": "Customer closed browser checkout iframe before authorization",
        "method": "UPI",
        "recoverability": 0.58,
        "strategy": "DUNNING_WHATSAPP",
        "weight": 0.10,
    },
    {
        "category": "LIMIT_EXCEEDED",
        "code": "CARD_ERROR_TXN_LIMIT",
        "reason": "Daily transaction limit exceeded for card/mandate",
        "method": "CARD_CREDIT",
        "recoverability": 0.62,
        "strategy": "DUNNING_EMAIL",
        "weight": 0.04,
    },
    {
        "category": "FRAUD_SUSPICION",
        "code": "RISK_DECLINE_HIGH_VELOCITY",
        "reason": "Velocity check triggered by issuer fraud defense",
        "method": "CARD_CREDIT",
        "recoverability": 0.12,
        "strategy": "MANUAL_INTERVENTION",
        "weight": 0.02,
    },
]


def generate_dataset(num_records=5000):
    records = []
    now = datetime.now()

    # Pre-generate customers
    customers = []
    for i in range(1200):
        c_id = f"cust_{1000 + i}"
        age_days = random.randint(15, 750)
        prev_success = random.randint(0, 30)
        prev_failed = random.randint(0, 5)
        spend = prev_success * random.randint(500, 5000)
        customers.append(
            {
                "id": c_id,
                "name": f"Customer {i+1}",
                "email": f"customer.{i+1}@example.com",
                "phone": f"+9198{random.randint(10000000, 99999999)}",
                "customer_age_days": age_days,
                "previous_successful_payments": prev_success,
                "previous_failed_payments": prev_failed,
                "previous_total_spend": spend,
            }
        )

    for i in range(num_records):
        cust = random.choice(customers)
        mch = random.choice(MERCHANTS)
        txn_id = f"txn_rzp_{10000000 + i}"
        days_ago = random.uniform(0, 30)
        created_at = (now - timedelta(days=days_ago)).isoformat()

        # Amounts
        tier = random.random()
        if tier < 0.4:
            amount = random.choice([499, 799, 999, 1499, 1999])
        elif tier < 0.75:
            amount = random.choice([2999, 4999, 7499, 9999])
        elif tier < 0.95:
            amount = random.choice([14999, 19999, 24999, 29999])
        else:
            amount = random.randint(30000, 50000)

        is_success = random.random() < 0.68

        if is_success:
            record = {
                "id": f"pay_{str(i+1).zfill(6)}",
                "transaction_id": txn_id,
                "merchant_id": mch["id"],
                "customer_id": cust["id"],
                "customer_name": cust["name"],
                "customer_email": cust["email"],
                "customer_phone": cust["phone"],
                "amount": float(amount),
                "currency": "INR",
                "payment_method": random.choice(["UPI", "CARD_CREDIT", "CARD_DEBIT", "NETBANKING", "AUTO_DEBIT"]),
                "payment_status": "SUCCESSFUL",
                "failure_code": None,
                "failure_reason": None,
                "failure_category": "NONE",
                "customer_age_days": cust["customer_age_days"],
                "previous_successful_payments": cust["previous_successful_payments"],
                "previous_failed_payments": cust["previous_failed_payments"],
                "previous_total_spend": float(cust["previous_total_spend"]),
                "retry_count": 0,
                "subscription_status": "ACTIVE" if random.random() > 0.4 else "NONE",
                "invoice_status": "PAID" if random.random() > 0.5 else "NONE",
                "checkout_status": "COMPLETED",
                "recovery_status": "NOT_APPLICABLE",
                "recovered_amount": 0.0,
                "ml_recovery_probability": 0.98,
                "recommended_strategy": "NONE",
                "created_at": created_at,
            }
        else:
            # Weighted failure pick
            weights = [s["weight"] for s in FAILURE_REASONS]
            scenario = random.choices(FAILURE_REASONS, weights=weights, k=1)[0]
            is_recovered = random.random() < scenario["recoverability"]
            is_recovering = (not is_recovered) and (random.random() < 0.55)

            if is_recovered:
                p_status = "RECOVERED"
                r_status = "RECOVERED"
                rec_amount = float(amount)
            elif is_recovering:
                p_status = "FAILED"
                r_status = "RECOVERING"
                rec_amount = 0.0
            else:
                p_status = "ABANDONED" if scenario["category"] == "CUSTOMER_ABANDONMENT" else "FAILED"
                r_status = "UNRECOVERABLE" if scenario["category"] == "FRAUD_SUSPICION" else "AT_RISK"
                rec_amount = 0.0

            record = {
                "id": f"pay_{str(i+1).zfill(6)}",
                "transaction_id": txn_id,
                "merchant_id": mch["id"],
                "customer_id": cust["id"],
                "customer_name": cust["name"],
                "customer_email": cust["email"],
                "customer_phone": cust["phone"],
                "amount": float(amount),
                "currency": "INR",
                "payment_method": scenario["method"],
                "payment_status": p_status,
                "failure_code": scenario["code"],
                "failure_reason": scenario["reason"],
                "failure_category": scenario["category"],
                "customer_age_days": cust["customer_age_days"],
                "previous_successful_payments": cust["previous_successful_payments"],
                "previous_failed_payments": cust["previous_failed_payments"] + 1,
                "previous_total_spend": float(cust["previous_total_spend"]),
                "retry_count": random.randint(0, 3),
                "subscription_status": "ACTIVE" if (is_recovered and random.random() > 0.4) else "PAST_DUE",
                "invoice_status": "PAID" if is_recovered else "PAST_DUE",
                "checkout_status": "DROPPED" if scenario["category"] == "CUSTOMER_ABANDONMENT" else "COMPLETED",
                "recovery_status": r_status,
                "recovered_amount": rec_amount,
                "ml_recovery_probability": round(scenario["recoverability"] + random.uniform(-0.05, 0.05), 4),
                "recommended_strategy": scenario["strategy"],
                "created_at": created_at,
            }

        records.append(record)

    return records


if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    dataset = generate_dataset(5000)
    with open("data/synthetic_payments_5000.json", "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)
    print(f"Generated {len(dataset)} records into data/synthetic_payments_5000.json")
