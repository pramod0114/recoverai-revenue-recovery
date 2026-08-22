"""
RecoverAI - Model Training Pipeline Skeleton
Trains scikit-learn GradientBoostingClassifier on synthetic payments dataset.
"""
import os
import json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, roc_auc_score
import joblib

def run_training():
    dataset_path = os.path.join(os.path.dirname(__file__), '../../data/synthetic_payments_5000.json')
    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}. Please run npm run generate-data first.")
        return

    with open(dataset_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    df = pd.DataFrame(data)
    print(f"Loaded dataset with {len(df)} records.")

    # Target: 1 if recovered, 0 otherwise for failed payments
    df_failed = df[df['payment_status'].isin(['FAILED', 'RECOVERED', 'ABANDONED'])].copy()
    df_failed['target'] = (df_failed['recovery_status'] == 'RECOVERED').astype(int)

    print(f"Total failure/recovery cases: {len(df_failed)}. Recovered: {df_failed['target'].sum()} ({df_failed['target'].mean()*100:.1f}%)")

if __name__ == "__main__":
    run_training()
