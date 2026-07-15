import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, LogIn, LogOut, Loader2, Save, Trash2, Plus, X, Upload, Edit } from 'lucide-react';

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'leaders' | 'events' | 'achievements' | 'star_members'>('leaders');
  const [data, setData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<any>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('erise_admin_session');
    if (session === 'authenticated') {
      setIsAuthenticated(true);
      fetchData(activeTab);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData(activeTab);
    }
  }, [activeTab, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        setError('Invalid username or password.');
      } else {
        localStorage.setItem('erise_admin_session', 'authenticated');
        setIsAuthenticated(true);
      }
    } catch (err) {
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('erise_admin_session');
    setIsAuthenticated(false);
  };

  const fetchData = async (table: string) => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase.from(table).select('*').order('id', { ascending: true });
      if (error) throw error;
      setData(data || []);
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const { error } = await supabase.from(activeTab).delete().eq('id', id);
      if (error) throw error;
      fetchData(activeTab);
    } catch (err) {
      alert('Error deleting item');
    }
  };

  const openModal = (mode: 'add' | 'edit', item?: any) => {
    setModalMode(mode);
    setFormData(item ? { ...item } : {});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (network: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      socials: {
        ...(prev.socials || {}),
        [network]: value
      }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${activeTab}/${fileName}`;

      // Upload to public_images bucket
      const { error: uploadError } = await supabase.storage
        .from('public_images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from('public_images').getPublicUrl(filePath);
      
      handleInputChange('image', data.publicUrl);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      alert('Error uploading image. Make sure the "public_images" bucket exists and is Public in Supabase Storage.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      
      if (modalMode === 'add') {
        delete payload.id;
        delete payload.created_at;
        const { error } = await supabase.from(activeTab).insert([payload]);
        if (error) throw error;
      } else {
        const { id, created_at, ...updatePayload } = payload;
        const { error } = await supabase.from(activeTab).update(updatePayload).eq('id', id);
        if (error) throw error;
      }

      closeModal();
      fetchData(activeTab);
    } catch (err: any) {
      console.error('Error saving:', err);
      alert(`Error saving data: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = () => {
    return (
      <div className="space-y-4">
        {/* Universal Name/Title field */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            {activeTab === 'leaders' || activeTab === 'star_members' ? 'Name' : 'Title'}
          </label>
          <input
            type="text"
            required
            value={formData.name || formData.title || ''}
            onChange={(e) => handleInputChange(activeTab === 'leaders' || activeTab === 'star_members' ? 'name' : 'title', e.target.value)}
            className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Image Field */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Image URL or Upload</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.image || ''}
              onChange={(e) => handleInputChange('image', e.target.value)}
              placeholder="https://... or click upload ->"
              className="flex-1 bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
            />
            <label className="bg-surface-elevated border border-subtle hover:border-accent cursor-pointer flex items-center justify-center px-4 rounded-lg transition-colors" title="Upload Image to Supabase">
              {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-accent" /> : <Upload className="w-5 h-5 text-secondary" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          {formData.image && (
            <div className="mt-2 h-32 w-32 rounded-lg border border-subtle overflow-hidden relative group">
                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Tab Specific Fields */}
        {activeTab === 'leaders' && (
          <>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Role (e.g. President, Head of Media)</label>
              <input
                type="text"
                required
                value={formData.role || ''}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formData.socials?.linkedin || ''}
                    onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                    className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.socials?.mail || ''}
                    onChange={(e) => handleSocialChange('mail', e.target.value)}
                    className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={formData.socials?.github || ''}
                    onChange={(e) => handleSocialChange('github', e.target.value)}
                    className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                  />
                </div>
            </div>
          </>
        )}

        {(activeTab === 'events' || activeTab === 'achievements') && (
          <>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Description</label>
              <textarea
                rows={4}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
              />
            </div>
            {activeTab === 'events' && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Date</label>
                <input
                  type="text"
                  placeholder="e.g. November 2026"
                  value={formData.date || ''}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'star_members' && (
          <>
             <div>
              <label className="block text-sm font-medium text-secondary mb-1">Organization / Status</label>
              <input
                type="text"
                placeholder="e.g. Intern at Google, Startup Founder"
                required
                value={formData.organization || ''}
                onChange={(e) => handleInputChange('organization', e.target.value)}
                className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </>
        )}
      </div>
    );
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dominant flex items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-2xl border border-subtle shadow-xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent">
              <User className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary text-center mb-6">Admin Login</h1>
          {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-muted text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dominant flex flex-col relative">
      {/* Header */}
      <header className="bg-surface border-b border-subtle p-4 px-8 flex justify-between items-center z-10">
        <h1 className="text-xl font-bold text-primary">E.R.I.S.E. Dashboard</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-surface border-r border-subtle p-4 flex flex-col gap-2 z-10">
          {['leaders', 'events', 'achievements', 'star_members'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab ? 'bg-accent text-white' : 'text-secondary hover:bg-subtle/50'
              }`}
            >
              <span className="capitalize">{tab.replace('_', ' ')}</span>
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-8 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary capitalize">{activeTab.replace('_', ' ')} Management</h2>
            <button 
              onClick={() => openModal('add')}
              className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-muted transition-colors shadow-lg shadow-accent/20"
            >
              <Plus className="w-4 h-4" /> Add New
            </button>
          </div>

          {dataLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="bg-surface border border-subtle rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-subtle/30 text-secondary text-sm uppercase">
                      <tr>
                        <th className="px-6 py-4 font-medium w-16">ID</th>
                        <th className="px-6 py-4 font-medium w-24">Image</th>
                        <th className="px-6 py-4 font-medium">Name/Title</th>
                        <th className="px-6 py-4 font-medium w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {data.map((item) => (
                        <tr key={item.id} className="hover:bg-subtle/20 transition-colors">
                          <td className="px-6 py-4 text-primary">{item.id}</td>
                          <td className="px-6 py-4">
                            {item.image ? (
                                <div className="w-10 h-10 rounded overflow-hidden border border-subtle">
                                    <img src={item.image} alt="Thumbnail" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded bg-dominant border border-subtle flex items-center justify-center">
                                    <span className="text-[10px] text-secondary">None</span>
                                </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-primary font-medium">{item.name || item.title}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <button 
                                onClick={() => openModal('edit', item)}
                                className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-lg transition-colors"
                                >
                                <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                onClick={() => handleDelete(item.id)}
                                className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {data.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-secondary">
                            No items found in {activeTab.replace('_', ' ')}. Add some to get started!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-subtle rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in">
                <div className="p-6 border-b border-subtle flex justify-between items-center">
                    <h3 className="text-xl font-bold text-primary capitalize">{modalMode} {activeTab.replace('_', ' ')}</h3>
                    <button onClick={closeModal} className="p-2 text-secondary hover:bg-subtle/50 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="crud-form" onSubmit={handleSave}>
                        {renderFormFields()}
                    </form>
                </div>
                <div className="p-6 border-t border-subtle flex justify-end gap-3 bg-dominant/50">
                    <button 
                        type="button" 
                        onClick={closeModal}
                        className="px-6 py-2 rounded-lg font-medium text-secondary hover:bg-subtle/50 border border-transparent transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        form="crud-form"
                        type="submit"
                        disabled={saving || uploadingImage}
                        className="px-6 py-2 rounded-lg font-bold bg-accent text-white hover:bg-accent-muted transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent/20"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
