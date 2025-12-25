/**
 * AI Models Section Component
 * Allows users to add, edit, and manage AI model configurations
 */

import { useState, useEffect } from 'react';
import '../../styles/settings.css';

interface AIModelsSection Props {
  userId: number;
}

interface AIModel {
  id: number;
  model_name: string;
  api_key: string;
  api_endpoint?: string;
  model_type: string;
  is_active: boolean;
}

function AIModelsSection({ userId }: AIModelsSectionProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    modelName: '',
    apiKey: '',
    apiEndpoint: '',
    modelType: 'text-generation',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, [userId]);

  /**
   * Load AI models from database
   */
  const loadModels = async () => {
    try {
      const result = await window.electron.getAIModels(userId);
      if (result.success) {
        setModels(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load AI models:', error);
    }
  };

  /**
   * Handle adding new AI model
   */
  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.modelName || !formData.apiKey) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electron.addAIModel({
        userId,
        modelName: formData.modelName,
        apiKey: formData.apiKey,
        apiEndpoint: formData.apiEndpoint,
        modelType: formData.modelType,
        isActive: true,
      });

      if (result.success) {
        setMessage('AI model added successfully!');
        setMessageType('success');
        setFormData({ modelName: '', apiKey: '', apiEndpoint: '', modelType: 'text-generation' });
        setShowForm(false);
        await loadModels();

        // Log action
        await window.electron.addActionLog({
          userId,
          actionType: 'ai_model_added',
          actionDescription: `AI model added: ${formData.modelName}`,
          status: 'completed',
          success: true,
        });
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle deleting AI model
   */
  const handleDeleteModel = async (modelId: number) => {
    if (!confirm('Are you sure you want to delete this AI model?')) return;

    try {
      const result = await window.electron.deleteAIModel(modelId);
      if (result.success) {
        setMessage('AI model deleted successfully!');
        setMessageType('success');
        await loadModels();

        await window.electron.addActionLog({
          userId,
          actionType: 'ai_model_deleted',
          actionDescription: `AI model deleted`,
          status: 'completed',
          success: true,
        });
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>🤖 AI Models Configuration</h3>
        <p>Add and manage AI models for CV generation, motivation letters, and company research</p>
      </div>

      {message && (
        <div className={`message message-${messageType}`}>
          {messageType === 'success' && '✓ '}
          {messageType === 'error' && '✗ '}
          {message}
        </div>
      )}

      {/* Add Model Form */}
      {showForm && (
        <form onSubmit={handleAddModel} className="settings-form">
          <div className="form-group">
            <label htmlFor="model-name">Model Name *</label>
            <input
              id="model-name"
              type="text"
              value={formData.modelName}
              onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
              placeholder="e.g., GPT-4, Gemini, Claude"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="model-type">Model Type *</label>
            <select
              id="model-type"
              value={formData.modelType}
              onChange={(e) => setFormData({ ...formData, modelType: e.target.value })}
              className="form-input"
              disabled={isLoading}
            >
              <option value="text-generation">Text Generation</option>
              <option value="image-generation">Image Generation</option>
              <option value="embedding">Embedding</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="api-key">API Key *</label>
            <input
              id="api-key"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="Your API key"
              className="form-input"
              disabled={isLoading}
            />
            <small>Your API key is stored securely on your computer</small>
          </div>

          <div className="form-group">
            <label htmlFor="api-endpoint">API Endpoint (Optional)</label>
            <input
              id="api-endpoint"
              type="url"
              value={formData.apiEndpoint}
              onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              placeholder="https://api.example.com/v1"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Model'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowForm(false)}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showForm && (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Add New AI Model
        </button>
      )}

      {/* Models List */}
      <div className="models-list">
        {models.length === 0 ? (
          <p className="empty-state">No AI models configured yet. Add one to get started!</p>
        ) : (
          models.map((model) => (
            <div key={model.id} className="model-card">
              <div className="model-info">
                <h4>{model.model_name}</h4>
                <p>Type: {model.model_type}</p>
                {model.api_endpoint && <p>Endpoint: {model.api_endpoint}</p>}
                <p className={`status ${model.is_active ? 'active' : 'inactive'}`}>
                  {model.is_active ? '✓ Active' : '✗ Inactive'}
                </p>
              </div>
              <button
                className="btn btn-danger btn-small"
                onClick={() => handleDeleteModel(model.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AIModelsSection;
