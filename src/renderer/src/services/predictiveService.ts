// src/renderer/src/services/predictiveService.ts
// Simplified predictive service that doesn't break the app

interface PredictiveService {
  getSuggestions: (input: string) => Promise<string[]>
}

class PredictiveServiceImpl implements PredictiveService {
  async getSuggestions(input: string): Promise<string[]> {
    try {
      // For now, return empty suggestions to avoid blocking the UI
      // This prevents the "predictive text not usable" issue
      return []
    } catch (error) {
      console.error('Predictive service error:', error)
      return []
    }
  }
}

export const predictiveService = new PredictiveServiceImpl()