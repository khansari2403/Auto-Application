import { useState, useEffect } from 'react';

function AIModelsSection({ userId }: { userId: number }) {
  const [models, setModels] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    modelName: '', apiKey: '', role: 'Hunter',
    writingStyle: 'Formal', wordLimit: '300', strictness: 'Balanced',
    functionalPrompt: '', cvStylePersona: 'Classic', referenceCvId: ''
  });

  const loadData = async () => {
    const modelRes = await (window as any).electron.invoke('ai-models:get-all', userId);
    if (modelRes?.success) setModels(modelRes.data);
    const docRes = await (window as any).electron.invoke('docs:get-all', userId);
    if (docRes?.success) setDocs(docRes.data.filter((d: any) => d.category === 'CV'));
  };

  useEffect(() => { loadData(); }, [userId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddOrUpdate = async () => {
    if (!formData.modelName || !formData.apiKey) return alert("Please fill in Name and API Key");
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
      cvStylePersona: 'Classic', referenceCvId: ''
    });
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
      referenceCvId: model.reference_cv_id || ''
    });
    setShowForm(true);
  };

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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Model Name</label>
              <input style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.modelName} onChange={(e) => handleInputChange('modelName', e.target.value)} />
              
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Assign Role</label>
              <select style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.role} onChange={(e) => handleInputChange('role', e.target.value)}>
                <option value="Hunter">🚀 The Hunter</option>
                <option value="Thinker">🧠 The Thinker</option>
                <option value="Auditor">🧐 The Auditor</option>
                <option value="Librarian">📚 The Librarian</option>
                <option value="Secretary">📧 The Secretary</option>
                <option value="Observer">👁️ The Observer</option>
                <option value="AI Mouse">🖱️ AI Mouse</option>
              </select>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Functional Prompt</label>
              <textarea style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.functionalPrompt} onChange={(e) => handleInputChange('functionalPrompt', e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>API Key</label>
              <input type="password" style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.apiKey} onChange={(e) => handleInputChange('apiKey', e.target.value)} />

              {formData.role === 'Thinker' && (
                <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>CV Style Persona</label>
                  <select style={{ width: '100%', padding: '8px', marginBottom: '10px' }} value={formData.cvStylePersona} onChange={e => handleInputChange('cvStylePersona', e.target.value)}>
                    <option value="Classic">The Classic</option>
                    <option value="Modern">The Modern</option>
                    <option value="Academic">The Academic</option>
                    <option value="Minimalist">The Minimalist</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          <button onClick={handleAddOrUpdate} style={{ padding: '12px 30px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>{editingModel ? 'Update Member' : 'Add to Team'}</button>
          <button onClick={() => { setShowForm(false); setEditingModel(null); }} style={{ marginLeft: '10px' }}>Cancel</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
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
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button onClick={() => toggleStatus(model)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>{model.status === 'active' ? 'Deactivate' : 'Activate'}</button>
              <button onClick={() => startEdit(model)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #0077b5', color: '#0077b5', background: '#fff', cursor: 'pointer' }}>Edit</button>
              <button onClick={async () => { if(confirm("Remove?")) { await (window as any).electron.invoke('ai-models:delete', model.id); loadData(); } }} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #f44336', color: '#f44336', background: '#fff', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AIModelsSection;
