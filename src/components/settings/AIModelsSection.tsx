import { useState, useEffect } from 'react';

interface ModelTestResult {
  modelId: number;
  status: 'untested' | 'testing' | 'success' | 'failed';
  message?: string;
  lastTested?: string;
}

function AIModelsSection({ userId }: { userId: number }) {
  const [models, setModels] = useState<any[]>([]);
  const [cvs, setCvs] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any>({ Speed: [], Cost: [], Quality: [] });
  const [isFetching, setIsFetching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    modelName: '', apiKey: '', role: 'Hunter', 
    writingStyle: 'Formal', wordLimit: '300', strictness: 'Balanced',
    functionalPrompt: '', cvStylePersona: 'Classic', referenceCvId: '',
    cvStyleCode: '',
    // Auditor-specific settings
    auditorSource: 'all' // 'linkedin' | 'manual' | 'uploaded_cv' | 'all'
  });
  
  // Test results tracking
  const [testResults, setTestResults] = useState<Record<number, ModelTestResult>>({});
  const [hasUnresponsiveModels, setHasUnresponsiveModels] = useState(false);

  const loadData = async () => {
    const res = await (window as any).electron.invoke('ai-models:get-all', userId);
    if (res?.success) {
      setModels(res.data);
      // Initialize test results
      const results: Record<number, ModelTestResult> = {};
      res.data.forEach((m: any) => {
        results[m.id] = { 
          modelId: m.id, 
          status: m.last_test_status || 'untested',
          message: m.last_test_message,
          lastTested: m.last_tested
        };
      });
      setTestResults(results);
    }
    
    const docRes = await (window as any).electron.invoke('docs:get-all', userId);
    if (docRes?.success) {
      setCvs(docRes.data.filter((d: any) => d.category === 'CV'));
    }
  };

  useEffect(() => { loadData(); }, [userId]);
  
  // Check for unresponsive models
  useEffect(() => {
    const failed = Object.values(testResults).some(r => r.status === 'failed');
    setHasUnresponsiveModels(failed);
  }, [testResults]);

  // Auto-test all models on first load
  useEffect(() => {
    if (models.length > 0) {
      const activeModels = models.filter(m => m.status === 'active');
      const untestedModels = activeModels.filter(m => !testResults[m.id] || testResults[m.id].status === 'untested');
      
      // Test untested active models on first load
      if (untestedModels.length > 0) {
        untestedModels.forEach(m => testModel(m));
      }
    }
  }, [models]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchAvailableModels = async () => {
    if (!formData.apiKey) return alert('Please enter an API Key first');
    setIsFetching(true);
    try {
      const result = await (window as any).electron.invoke('ai:fetch-models', formData.apiKey, formData.role);
      setIsFetching(false);
      if (result && result.success) {
        setAvailableModels(Array.isArray(result.data) ? result.data : []);
        setRecommendations(result.recommendations || { Speed: [], Cost: [], Quality: [] });
      } else {
        alert('Failed to fetch models: ' + (result?.error || 'Unknown error'));
      }
    } catch (error: any) {
      setIsFetching(false);
      alert('IPC Error: ' + error.message);
    }
  };

  // Test a single model
  const testModel = async (model: any) => {
    setTestResults(prev => ({
      ...prev,
      [model.id]: { modelId: model.id, status: 'testing' }
    }));
    
    try {
      const result = await (window as any).electron.invoke('ai:test-model', {
        modelId: model.id,
        modelName: model.model_name,
        apiKey: model.api_key,
        apiEndpoint: model.api_endpoint
      });
      
      const testResult: ModelTestResult = {
        modelId: model.id,
        status: result.success ? 'success' : 'failed',
        message: result.message || (result.success ? 'Model responding' : 'Model not responding'),
        lastTested: new Date().toISOString()
      };
      
      setTestResults(prev => ({ ...prev, [model.id]: testResult }));
      
      // Save test result to database
      await (window as any).electron.invoke('ai-models:update', {
        ...model,
        last_test_status: testResult.status,
        last_test_message: testResult.message,
        last_tested: testResult.lastTested
      });
      
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [model.id]: { 
          modelId: model.id, 
          status: 'failed', 
          message: error.message,
          lastTested: new Date().toISOString()
        }
      }));
    }
  };

  // Test all active models
  const testAllModels = async () => {
    const activeModels = models.filter(m => m.status === 'active');
    for (const model of activeModels) {
      await testModel(model);
    }
  };

  const handleSave = async () => {
    if (!formData.modelName || !formData.apiKey) return alert('Fill in Model Name and API Key');
    if (editingModel) {
      await (window as any).electron.invoke('ai-models:update', { ...formData, id: editingModel.id });
    } else {
      await (window as any).electron.invoke('ai-models:add', { ...formData, userId });
    }
    setShowForm(false);
    setEditingModel(null);
    setFormData({ 
      modelName: '', apiKey: '', role: 'Hunter', writingStyle: 'Formal', 
      wordLimit: '300', strictness: 'Balanced', functionalPrompt: '',
      cvStylePersona: 'Classic', referenceCvId: '', cvStyleCode: ''
    });
    setAvailableModels([]);
    setRecommendations({ Speed: [], Cost: [], Quality: [] });
    loadData();
  };

  const toggleStatus = async (model: any) => {
    const newStatus = model.status === 'active' ? 'inactive' : 'active';
    await (window as any).electron.invoke('ai-models:update', { ...model, status: newStatus });
    loadData();
  };

  const startEdit = (model: any) => {
    setEditingModel(model);
    setFormData({
      modelName: model.model_name,
      apiKey: model.api_key,
      role: model.role,
      writingStyle: model.writing_style || 'Formal',
      wordLimit: model.word_limit || '300',
      strictness: model.strictness || 'Balanced',
      functionalPrompt: model.functional_prompt || '',
      cvStylePersona: model.cv_style_persona || 'Classic',
      referenceCvId: model.reference_cv_id || '',
      cvStyleCode: model.cv_style_code || ''
    });
    setShowForm(true);
  };

  const renderRecCategory = (label: string, recs: any[]) => {
    if (!recs || recs.length === 0) return null;
    return (
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0d47a1', marginBottom: '8px', textTransform: 'uppercase' }}>{label} Contestants:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {recs.map(rec => (
            <div key={rec.id} onClick={() => handleInputChange('modelName', rec.id)} style={{ cursor: 'pointer', padding: '8px', background: formData.modelName === rec.id ? '#fff' : 'rgba(255,255,255,0.5)', borderRadius: '6px', border: formData.modelName === rec.id ? '2px solid #0077b5' : '1px solid #eee', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.id.split('/').pop()}</div>
              <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>{rec.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getTestStatusIcon = (modelId: number) => {
    const result = testResults[modelId];
    if (!result) return '❓';
    switch (result.status) {
      case 'testing': return '⏳';
      case 'success': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getTestStatusColor = (modelId: number) => {
    const result = testResults[modelId];
    if (!result) return '#999';
    switch (result.status) {
      case 'testing': return '#ff9800';
      case 'success': return '#4CAF50';
      case 'failed': return '#f44336';
      default: return '#999';
    }
  };

  const isThinker = formData.role === 'Thinker';
  const isSecretary = formData.role === 'Secretary';
  const isAuditor = formData.role === 'Auditor';
  const isWritingRole = isThinker || isSecretary;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Warning Banner for Unresponsive Models */}
      {hasUnresponsiveModels && (
        <div style={{
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
          color: '#fff',
          padding: '15px 20px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 15px rgba(255,107,107,0.3)'
        }}>
          <span style={{ fontSize: '28px' }}>⚠️</span>
          <div>
            <strong style={{ fontSize: '14px' }}>Some AI Models Are Not Responding</strong>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
              One or more of your active AI models failed the connectivity test. Please check their API keys or switch to a different model before starting job applications.
            </p>
          </div>
          <button 
            onClick={testAllModels}
            style={{ 
              marginLeft: 'auto', 
              padding: '10px 20px', 
              background: 'rgba(255,255,255,0.2)', 
              color: '#fff', 
              border: '1px solid rgba(255,255,255,0.3)', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            🔄 Re-Test All
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>🤖 Your Active AI Team</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={testAllModels} 
            style={{ padding: '12px 20px', background: '#673ab7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🧪 Test All Models
          </button>
          <button onClick={() => setShowForm(true)} style={{ padding: '12px 25px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Recruit New Member</button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: '#f9f9f9', padding: '25px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #ddd' }}>
          <h4>{editingModel ? 'Edit Team Member' : 'Recruit New Member'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>1. Assign Role First</label>
              <select style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.role} onChange={(e) => handleInputChange('role', e.target.value)}>
                <option value='Hunter'>🚀 The Hunter</option>
                <option value='Thinker'>🧠 The Thinker</option>
                <option value='Auditor'>🧐 The Auditor</option>
                <option value='HR AI'>🎯 HR AI (Interview & Compatibility)</option>
                <option value='Librarian'>📚 The Librarian</option>
                <option value='Secretary'>📧 The Secretary</option>
                <option value='Observer'>👁️ The Observer</option>
                <option value='AI Mouse'>🖱️ AI Mouse</option>
              </select>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>2. API Key</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input type='password' style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.apiKey} onChange={(e) => handleInputChange('apiKey', e.target.value)} placeholder='Paste API Key...' />
                <button onClick={fetchAvailableModels} disabled={isFetching} style={{ padding: '10px', background: '#673ab7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                  {isFetching ? '⏳' : 'Fetch Models'}
                </button>
              </div>

              {(recommendations.Speed.length > 0 || recommendations.Cost.length > 0 || recommendations.Quality.length > 0) && (
                <div style={{ marginBottom: '15px', padding: '15px', background: '#e3f2fd', borderRadius: '10px', border: '1px solid #bbdefb' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0d47a1', marginBottom: '12px' }}>⭐ TOP 3 CONTESTANTS FOR {formData.role.toUpperCase()}:</div>
                  {renderRecCategory('Highest Speed', recommendations.Speed)}
                  {renderRecCategory('Lowest Cost', recommendations.Cost)}
                  {renderRecCategory('Highest Quality', recommendations.Quality)}
                </div>
              )}

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>3. Model Name</label>
              {availableModels.length > 0 ? (
                <select style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.modelName} onChange={(e) => handleInputChange('modelName', e.target.value)}>
                  <option value=''>-- Select a model --</option>
                  {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.modelName} onChange={(e) => handleInputChange('modelName', e.target.value)} placeholder='e.g. Qwen/Qwen3-VL-32B-Instruct' />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Functional Prompt</label>
              <textarea style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '15px' }} value={formData.functionalPrompt} onChange={(e) => handleInputChange('functionalPrompt', e.target.value)} placeholder='Specific instructions for this role...' />

              {isWritingRole && (
                <>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>CV Style Persona</label>
                  <select style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.cvStylePersona} onChange={(e) => handleInputChange('cvStylePersona', e.target.value)}>
                    <option value='Classic'>The Classic</option>
                    <option value='Modern'>The Modern</option>
                    <option value='Academic'>The Academic</option>
                    <option value='Minimalist'>The Minimalist</option>
                    {isThinker && <option value='Mimic my CV'>Mimic my OLD CV</option>}
                  </select>

                  {isThinker && formData.cvStylePersona === 'Mimic my CV' ? (
                    <>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Select Reference CV</label>
                      <select style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.referenceCvId} onChange={(e) => handleInputChange('referenceCvId', e.target.value)}>
                        <option value=''>-- Select a CV --</option>
                        {cvs.map(cv => <option key={cv.id} value={cv.id}>{cv.file_name}</option>)}
                      </select>
                    </>
                  ) : (
                    <>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Writing Style (Tone)</label>
                      <select style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.writingStyle} onChange={(e) => handleInputChange('writingStyle', e.target.value)}>
                        <option value='Formal'>Formal</option>
                        <option value='Professional'>Professional</option>
                        <option value='Creative'>Creative</option>
                        <option value='Concise'>Concise</option>
                      </select>
                    </>
                  )}

                  {isThinker && (
                    <>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Import CV Style Code</label>
                      <input style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.cvStyleCode} onChange={(e) => handleInputChange('cvStyleCode', e.target.value)} placeholder='Paste style code here...' />
                    </>
                  )}

                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Word Limit</label>
                  <input type='number' style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.wordLimit} onChange={(e) => handleInputChange('wordLimit', e.target.value)} />
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={handleSave} style={{ flex: 1, padding: '12px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{editingModel ? 'Update Member' : 'Add to Team'}</button>
            <button onClick={() => { setShowForm(false); setEditingModel(null); setAvailableModels([]); setRecommendations({ Speed: [], Cost: [], Quality: [] }); }} style={{ padding: '12px 25px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {models.map(model => {
          const testResult = testResults[model.id];
          const isTesting = testResult?.status === 'testing';
          const testFailed = testResult?.status === 'failed';
          
          return (
            <div key={model.id} style={{ 
              padding: '20px', 
              background: testFailed ? '#fff5f5' : '#fff', 
              border: testFailed ? '2px solid #f44336' : '1px solid #eee', 
              borderRadius: '12px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
              opacity: model.status === 'active' ? 1 : 0.6,
              position: 'relative'
            }}>
              {/* Test Status Indicator */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ fontSize: '16px' }}>{getTestStatusIcon(model.id)}</span>
                {testResult?.lastTested && (
                  <span style={{ fontSize: '9px', color: getTestStatusColor(model.id) }}>
                    {new Date(testResult.lastTested).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#0077b5', fontWeight: 'bold', textTransform: 'uppercase' }}>{model.role}</div>
                  <strong style={{ fontSize: '18px', display: 'block', margin: '5px 0' }}>{model.model_name}</strong>
                </div>
                <div style={{ textAlign: 'right', marginTop: '20px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: model.status === 'active' ? '#4CAF50' : '#999', display: 'inline-block' }}></div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{model.status?.toUpperCase()}</div>
                </div>
              </div>
              
              {/* Test Result Message */}
              {testResult?.message && testFailed && (
                <div style={{ 
                  fontSize: '11px', 
                  color: '#f44336', 
                  background: '#ffebee', 
                  padding: '8px', 
                  borderRadius: '6px', 
                  marginTop: '10px',
                  border: '1px solid #ffcdd2'
                }}>
                  ⚠️ {testResult.message}
                </div>
              )}
              
              {model.functional_prompt && (
                <div style={{ fontSize: '12px', color: '#666', background: '#f5f5f5', padding: '10px', borderRadius: '8px', marginTop: '12px', fontStyle: 'italic', border: '1px solid #eee' }}>
                  \" {model.functional_prompt.substring(0, 80)}{model.functional_prompt.length > 80 ? '...' : ''} \"
                </div>
              )}

              <div style={{ marginTop: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => testModel(model)} 
                  disabled={isTesting}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid #673ab7', 
                    color: '#673ab7', 
                    background: '#fff', 
                    cursor: isTesting ? 'wait' : 'pointer', 
                    fontSize: '12px',
                    opacity: isTesting ? 0.7 : 1
                  }}
                >
                  {isTesting ? '⏳ Testing...' : '🧪 Test'}
                </button>
                <button onClick={() => toggleStatus(model)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>{model.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => startEdit(model)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #0077b5', color: '#0077b5', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                <button onClick={async () => { if(confirm('Remove?')) { await (window as any).electron.invoke('ai-models:delete', model.id); loadData(); } }} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #f44336', color: '#f44336', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AIModelsSection;
