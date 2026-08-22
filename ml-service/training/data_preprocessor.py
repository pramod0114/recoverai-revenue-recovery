"""
RecoverAI - Data Preprocessing and Feature Pipeline
"""
import pandas as pd
import numpy as np

def prepare_features(df: pd.DataFrame):
    """
    Cleans raw payment data and encodes categorical signals into numeric feature matrices.
    """
    df = df.copy()
    
    # Feature mappings
    method_map = {'CARD_CREDIT': 0, 'CARD_DEBIT': 1, 'UPI': 2, 'NETBANKING': 3, 'AUTO_DEBIT': 4, 'WALLET': 5}
    df['payment_method_encoded'] = df['payment_method'].map(method_map).fillna(-1)
    
    # Numerical log transforms for skewed payment amounts
    df['log_amount'] = np.log1p(df['amount'].astype(float))
    df['log_prev_spend'] = np.log1p(df['previous_total_spend'].astype(float))
    
    # Ratios
    total_txns = df['previous_successful_payments'] + df['previous_failed_payments'] + 1
    df['success_ratio'] = df['previous_successful_payments'] / total_txns
    
    feature_cols = [
        'log_amount',
        'payment_method_encoded',
        'customer_age_days',
        'previous_successful_payments',
        'previous_failed_payments',
        'log_prev_spend',
        'retry_count',
        'success_ratio'
    ]
    
    return df[feature_cols]
