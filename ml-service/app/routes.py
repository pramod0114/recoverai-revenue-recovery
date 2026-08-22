from fastapi import APIRouter
from app.schemas import PaymentFailureInput, RecoveryPredictionResponse, BatchDiagnosisRequest, BatchDiagnosisResponse

router = APIRouter()

@router.get("/model-info")
def get_model_info():
    return {
        "model_type": "GradientBoostingClassifier / LogisticRegression Ensemble",
        "target": "recovery_success_binary",
        "features": [
            "amount",
            "payment_method",
            "failure_category",
            "customer_age_days",
            "previous_successful_payments",
            "previous_failed_payments",
            "retry_count",
            "subscription_status"
        ],
        "training_dataset_size": 5000,
        "status": "READY_FOR_PART_2_TRAINING"
    }

@router.post("/predict-recovery-score", response_model=RecoveryPredictionResponse)
def predict_single(payment: PaymentFailureInput):
    # Rule-assisted baseline diagnostics for Part 1 foundation
    method = payment.payment_method.upper()
    code = (payment.failure_code or "").upper()
    
    prob = 0.65
    strategy = "SMART_RETRY_OFFPEAK"
    channel = "EMAIL"
    delay = 12
    factors = []

    if "INSUFFICIENT" in code:
        prob = 0.82
        strategy = "SMART_RETRY_OFFPEAK"
        channel = "WHATSAPP"
        delay = 24
        factors.append("Insufficient funds often resolves post-salary cycle (1st/10th of month).")
    elif "EXPIRED" in code:
        prob = 0.74
        strategy = "ONE_CLICK_MANDATE_UPDATE"
        channel = "EMAIL"
        delay = 1
        factors.append("Card expiration requires payment method update token.")
    elif "DOWN" in code or "TIMEOUT" in code:
        prob = 0.89
        strategy = "METHOD_SWITCH_UPI"
        channel = "SMS"
        delay = 2
        factors.append("Bank gateway transient issue; UPI fallback recommended.")
    elif "DROPOUT" in code or "ABANDON" in code:
        prob = 0.58
        strategy = "DUNNING_WHATSAPP"
        channel = "WHATSAPP"
        delay = 1
        factors.append("Customer abandoned checkout session.")
    elif "RISK" in code or "FRAUD" in code:
        prob = 0.12
        strategy = "MANUAL_INTERVENTION"
        channel = "MANUAL"
        delay = 0
        factors.append("High fraud velocity score; automated retries suppressed.")

    risk_level = "LOW" if prob >= 0.75 else ("MEDIUM" if prob >= 0.45 else "HIGH")

    return RecoveryPredictionResponse(
        transaction_id=payment.transaction_id,
        ml_recovery_probability=prob,
        recommended_strategy=strategy,
        optimal_retry_delay_hours=delay,
        recommended_channel=channel,
        risk_level=risk_level,
        confidence_score=0.88,
        explainability_factors=factors or ["Standard recovery profile evaluated."]
    )

@router.post("/batch-diagnose", response_model=BatchDiagnosisResponse)
def batch_diagnose(request: BatchDiagnosisRequest):
    results = [predict_single(p) for p in request.payments]
    return BatchDiagnosisResponse(
        processed_count=len(results),
        predictions=results
    )
