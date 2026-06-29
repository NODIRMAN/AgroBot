export interface DiagnosisRequest {
  crop: string;
  part: string;
  symptoms: string;
  distribution: string;
  image?: string; // Base64 image
}

export interface SavedDiagnosis {
  id: string;
  date: string;
  crop: string;
  part: string;
  symptoms: string;
  distribution: string;
  image?: string;
  result: string;
}
