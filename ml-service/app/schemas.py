from pydantic import BaseModel, Field
from typing import Optional, List

class PaymentFailureInput(BaseModel):
    transaction_id: str
    amount: float
    currency: str = "INR"
    payment_method: str
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    customer_age_days: int = Field(default=30, ge=0)
    previous_successful_payments: int = Field(default=0, ge=0)
    previous_failed_payments: int = Field(default=0, ge=0)
    previous_total_spend: float = Field(default=0.0, ge=0.0)
    retry_count: int = Field(default=0, ge=0)
    subscription_status: Optional[str] = "NONE"

class RecoveryPredictionResponse(BaseModel):
    transaction_id: str
    ml_recovery_probability: float
    recommended_strategy: str
    optimal_retry_delay_hours: int
    recommended_channel: str
    risk_level: str
    confidence_score: float
    explainability_factors: List[str]

class BatchDiagnosisRequest(BaseModel):
    payments: List[PaymentFailureInput]

class BatchDiagnosisResponse(BaseModel):
    processed_count: int
    predictions: List[RecoveryPredictionResponse]
