import { useState, useEffect } from 'react';

function AIModelsSection({ userId }: { userId: number }) {
  const [models, setModels] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
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

  const handleAdd = async () => {
    if (!formData.modelName || !formData.apiKey) return alert("Please fill in Name and API Key");
    await (window as any).electron.invoke('ai-models:add', { ...formData, userId });
    setShowForm(false);
    setFormData({ 
      modelName: '', apiKey: '', role: 'Hunter', writingStyle: 'Formal', 
      wordLimit: '300', strictness: 'Balanced', functionalPrompt: '',
      cvStylePersona: 'Classic', referenceCvId: ''
    });
    loadData();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      {/* FULL STRATEGY GUIDE */}
      <div style={{ marginBottom: '30px' }}>
        <button onClick={() => setShowGuide(!showGuide)} style={{ width: '100%', padding: '15px', background: '#f0f7ff', border: '1px solid #0077b5', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
          <strong style={{ color: '#0077b5', fontSize: '16px' }}>📘 AI Team Strategy & Model Selection Guide</strong>
          <span>{showGuide ? '▲ Close Guide' : '▼ Open Detailed Guide'}</span>
        </button>
        {showGuide && (
          <div style={{ background: '#fff', padding: '25px', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 10px 10px', fontSize: '13px', lineHeight: '1.6', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <div>
                <strong style={{ color: '#0077b5', fontSize: '15px' }}>🚀 The Hunter (Search & Apply)</strong><br/>
                <p><em>Goal:</em> Scans job boards and fills initial forms. Needs speed and internet access.</p>
                <strong>Paid:</strong> GPT-4o-mini, Gemini 1.5 Flash (Ultra cheap/fast).<br/>
                <strong>Free:</strong> Llama 3.1 (via Groq API - extremely fast).<br/>
                <strong>Strategy:</strong> Add 2-3 Hunters to scan different sites (LinkedIn, Indeed) at the same time.
              </div>
              <div>
                <strong style={{ color: '#0077b5', fontSize: '15px' }}>🧠 The Thinker (Adam)</strong><br/>
                <p><em>Goal:</em> Researches company news and writes tailored CVs. Needs high reasoning.</p>
                <strong>Paid:</strong> GPT-4o, Claude 3.5 Sonnet (Best for "human" writing).<br/>
                <strong>Free:</strong> Llama 3.1 70B (via Groq).<br/>
                <strong>Strategy:</strong> Use the "Mimic My Style" option to give the Thinker a blueprint of your voice.
              </div>
              <div>
                <strong style={{ color: '#0077b5', fontSize: '15px' }}>🧐 The Auditor (Eve)</strong><br/>
                <p><em>Goal:</em> Meticulously checks work for accuracy. Needs zero hallucinations.</p>
                <strong>Paid:</strong> GPT-4o, Claude 3.5 Opus (The most "intelligent" models).<br/>
                <strong>Free:</strong> Llama 3.1 405B (via OpenRouter).<br/>
                <strong>Strategy:</strong> Set strictness to "Meticulous" for high-stakes corporate applications.
              </div>
              <div>
                <strong style={{ color: '#0077b5', fontSize: '15px' }}>📧 The Secretary</strong><br/>
                <p><em>Goal:</em> Monitors Gmail and drafts follow-ups. Needs to be concise.</p>
                <strong>Paid:</strong> GPT-4o-mini (Perfect for small tasks).<br/>
                <strong>Free:</strong> Mistral Nemo, Llama 3.2 3B.<br/>
                <strong>Strategy:</strong> Set a low word limit (e.g., 150 words) to keep follow-ups punchy.
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>🤖 Your Active AI Team</h3>
        <button onClick={() => setShowForm(true)} style={{ padding: '12px 25px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Recruit New Member</button>
      </div>

      {showForm && (
        <div style={{ background: '#f9f9f9', padding: '25px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #ddd' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Model Name (e.g. Adam)</label>
              <input style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.modelName} onChange={(e) => setFormData({...formData, modelName: e.target.value})} />
              
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Assign Role</label>
              <select style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                <option value="Hunter">🚀 The Hunter</option>
                <option value="Thinker">🧠 The Thinker</option>
                <option value="Auditor">🧐 The Auditor</option>
                <option value="Librarian">📚 The Librarian</option>
                <option value="Secretary">📧 The Secretary</option>
              </select>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Functional Prompt</label>
              <textarea style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.functionalPrompt} onChange={(e) => setFormData({...formData, functionalPrompt: e.target.value})} placeholder="Direct instructions..." />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>API Key</label>
              <input type="password" style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }} value={formData.apiKey} onChange={(e) => setFormData({...formData, apiKey: e.target.value})} />

              {formData.role === 'Thinker' && (
                <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>CV Style Persona</label>
                  <select style={{ width: '100%', padding: '8px', marginBottom: '10px' }} value={formData.cvStylePersona} onChange={e => setFormData({...formData, cvStylePersona: e.target.value})}>
                    <option value="Classic">The Classic</option>
                    <option value="Modern">The Modern</option>
                    <option value="Academic">The Academic</option>
                    <option value="Minimalist">The Minimalist</option>
                  </select>
                </div>
              )}

              {(formData.role === 'Thinker' || formData.role === 'Secretary') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Writing Style</label>
                    <select style={{ width: '100%', padding: '10px', borderRadius: '6px' }} value={formData.writingStyle} onChange={(e) => setFormData({...formData, writingStyle: e.target.value})}>
                      <option value="Formal">Formal</option>
                      <option value="Informal">Informal</option>
                      <option value="Creative">Creative</option>
                      <option value="Concise">Concise</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Word Limit</label>
                    <input type="number" style={{ width: '100%', padding: '10px', borderRadius: '6px' }} value={formData.wordLimit} onChange={(e) => setFormData({...formData, wordLimit: e.target.value})} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={handleAdd} style={{ padding: '12px 30px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>Add to Team</button>
          <button onClick={() => setShowForm(false)} style={{ marginLeft: '10px' }}>Cancel</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {models.map(model => (
          <div key={model.id} style={{ padding: '20px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#0077b5', fontWeight: 'bold', textTransform: 'uppercase' }}>{model.role}</div>
                <strong style={{ fontSize: '18px', display: 'block', margin: '5px 0' }}>{model.model_name}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }}></div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>ACTIVE</div>
              </div>
            </div>
            <button onClick={async () => { if(confirm("Remove?")) { await (window as any).electron.invoke('ai-models:delete', model.id); loadData(); } }} 
              style={{ marginTop: '15px', background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>🗑️ Remove</button>
          </div>
        ))}
      </div>

      {/* DEBUG BOX */}
      <div style={{ marginTop: '40px', padding: '15px', background: '#f5f5f5', borderRadius: '8px', fontSize: '11px' }}>
        <strong>🛠️ Team Status Debug:</strong><br/>
        Thinker (Adam): {models.find(m => m.role === 'Thinker') ? '✅ Found' : '❌ Missing'}<br/>
        Auditor (Eve): {models.find(m => m.role === 'Auditor') ? '✅ Found' : '❌ Missing'}
      </div>
    </div>
  );
}

export default AIModelsSection;