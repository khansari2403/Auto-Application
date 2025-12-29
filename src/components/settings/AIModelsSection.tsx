import { useState, useEffect } from 'react';

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
    cvStyleCode: ''
  });

  const loadData = async () => {
    const res = await (window as any).electron.invoke('ai-models:get-all', userId);
    if (res?.success) setModels(res.data);
    
    const docRes = await (window as any).electron.invoke('docs:get-all', userId);
    if (docRes?.success) {
      setCvs(docRes.data.filter((d: any) => d.category === 'CV'));
    }
  };

  useEffect(() => { loadData(); }, [userId]);

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

  const isThinker = formData.role === 'Thinker';
  const isSecretary = formData.role === 'Secretary';
  const isWritingRole = isThinker || isSecretary;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>🤖 Your Active AI Team</h3>
        <button onClick={() => setShowForm(true)} style={{ padding: '12px 25px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Recruit New Member</button>
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
        {models.map(model => (
          <div key={model.id} style={{ padding: '20px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', opacity: model.status === 'active' ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#0077b5', fontWeight: 'bold', textTransform: 'uppercase' }}>{model.role}</div>
                <strong style={{ fontSize: '18px', display: 'block', margin: '5px 0' }}>{model.model_name}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: model.status === 'active' ? '#4CAF50' : '#999', display: 'inline-block' }}></div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{model.status?.toUpperCase()}</div>
              </div>
            </div>
            
            {model.functional_prompt && (
              <div style={{ fontSize: '12px', color: '#666', background: '#f5f5f5', padding: '10px', borderRadius: '8px', marginTop: '12px', fontStyle: 'italic', border: '1px solid #eee' }}>
                \" {model.functional_prompt.substring(0, 80)}{model.functional_prompt.length > 80 ? '...' : ''} \"
              </div>
            )}

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button onClick={() => toggleStatus(model)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>{model.status === 'active' ? 'Deactivate' : 'Activate'}</button>
              <button onClick={() => startEdit(model)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #0077b5', color: '#0077b5', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
              <button onClick={async () => { if(confirm('Remove?')) { await (window as any).electron.invoke('ai-models:delete', model.id); loadData(); } }} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #f44336', color: '#f44336', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AIModelsSection;