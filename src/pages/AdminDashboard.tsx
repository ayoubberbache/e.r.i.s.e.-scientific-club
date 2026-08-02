import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, LogIn, LogOut, Loader2, Save, Trash2, Plus, X, Upload, Edit, 
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, ClipboardList, Users, 
  Award, Calendar, Star, Download, CheckCircle, XCircle, Menu, Car, 
  Building2, UserCheck, Clock, Filter, FileText, Check, Copy, Phone, 
  Mail, GraduationCap, Search, ExternalLink
} from 'lucide-react';

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'leaders' | 'events' | 'event_registrations' | 'achievements' | 'star_members' | 'registrations'>('leaders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // General Registration toggle state
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [togglingRegistration, setTogglingRegistration] = useState(false);

  // Event Registrations Tab State
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [eventRegsLoading, setEventRegsLoading] = useState(false);

  // Expanded registration rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<any>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Duration preset state for event deadline
  const [deadlinePreset, setDeadlinePreset] = useState<string>('custom');

  // Member Detail Panel & Intake Filter State
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState<boolean>(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const handleMemberStatusChange = async (id: number, newStatus: 'approved' | 'rejected' | 'pending') => {
    setStatusUpdatingId(id);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setData((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));

      if (selectedMember && selectedMember.id === id) {
        setSelectedMember((prev: any) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      console.error('Error updating member status:', err);
      alert(`Failed to update member status: ${err.message || err}`);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDeleteMember = async (id: number, name?: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name || 'this member'}?`)) return;
    try {
      const { error } = await supabase.from('registrations').delete().eq('id', id);
      if (error) throw error;

      if (selectedMember && selectedMember.id === id) {
        setMemberModalOpen(false);
        setSelectedMember(null);
      }
      fetchData('registrations');
    } catch (err: any) {
      console.error('Error deleting member:', err);
      alert(`Error deleting member: ${err.message || err}`);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
  };

  const copyAllMemberInfo = (member: any) => {
    const depts = Array.isArray(member.departments) ? member.departments.join(', ') : (member.departments || 'None');
    const text = `E.R.I.S.E. Member Registration Details:
-----------------------------------
Full Name: ${member.full_name || 'N/A'}
Status: ${(member.status || 'pending').toUpperCase()}
Email: ${member.email || 'N/A'}
Phone: ${member.phone || 'N/A'}
Study Year: Year ${member.study_year || 'N/A'}
Specialization: ${member.specialization || 'N/A'}
Departments: ${depts}
Registered Date: ${member.registered_at ? formatDate(member.registered_at) : 'N/A'}`;

    copyToClipboard(text, 'all');
  };

  const exportClubRegistrationsCSV = () => {
    if (data.length === 0) {
      alert('No registrations available to export.');
      return;
    }

    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Study Year', 'Specialization', 'Departments', 'Status', 'Registered At'];
    const rows = data.map((item) => {
      const depts = Array.isArray(item.departments) ? item.departments.join(' | ') : (item.departments || '');
      return [
        item.id,
        item.full_name || '',
        item.email || '',
        item.phone || '',
        item.study_year || '',
        item.specialization || '',
        depts,
        item.status || 'pending',
        item.registered_at || ''
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erise_club_members_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const session = localStorage.getItem('erise_admin_session');
    if (session === 'authenticated') {
      setIsAuthenticated(true);
      fetchRegistrationStatus();
      fetchEventsList();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'event_registrations') {
        fetchEventsList();
        fetchEventRegistrations(selectedEventId);
      } else {
        fetchData(activeTab);
      }
    }
  }, [activeTab, isAuthenticated]);

  const fetchRegistrationStatus = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'registration_open')
        .single();
      if (data) setRegistrationOpen(data.value === 'true');
    } catch (err) {
      console.error('Error fetching registration status:', err);
    }
  };

  const fetchEventsList = async () => {
    try {
      const { data } = await supabase.from('events').select('id, title, registration_enabled, registration_type').order('id', { ascending: false });
      if (data) setEventsList(data);
    } catch (err) {
      console.error('Error fetching events list:', err);
    }
  };

  const fetchEventRegistrations = async (eventIdFilter: string) => {
    setEventRegsLoading(true);
    try {
      let query = supabase.from('event_registrations').select(`
        *,
        events ( title ),
        event_registration_members ( * )
      `).order('registered_at', { ascending: false });

      if (eventIdFilter !== 'all') {
        query = query.eq('event_id', Number(eventIdFilter));
      }

      const { data, error } = await query;
      if (error) throw error;
      setEventRegistrations(data || []);
    } catch (err) {
      console.error('Error fetching event registrations:', err);
    } finally {
      setEventRegsLoading(false);
    }
  };

  const toggleRegistration = async () => {
    setTogglingRegistration(true);
    try {
      const newValue = !registrationOpen;
      const { error } = await supabase
        .from('site_settings')
        .update({ value: String(newValue), updated_at: new Date().toISOString() })
        .eq('key', 'registration_open');
      if (error) throw error;
      setRegistrationOpen(newValue);
    } catch (err) {
      console.error('Error toggling registration:', err);
      alert('Failed to toggle registration status.');
    } finally {
      setTogglingRegistration(false);
    }
  };

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
        fetchRegistrationStatus();
        fetchEventsList();
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
      const orderCol = table === 'registrations' ? 'registered_at' : 'id';
      const ascending = table !== 'registrations';
      const { data, error } = await supabase.from(table).select('*').order(orderCol, { ascending });
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

  const handleDeleteEventReg = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this event registration?')) return;
    try {
      const { error } = await supabase.from('event_registrations').delete().eq('id', id);
      if (error) throw error;
      fetchEventRegistrations(selectedEventId);
    } catch (err) {
      alert('Error deleting event registration.');
    }
  };

  const handleEventRegStatusChange = async (id: number, newStatus: string) => {
    try {
      const { error } = await supabase.from('event_registrations').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setEventRegistrations(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch (err) {
      alert('Failed to update event registration status.');
    }
  };

  const openModal = (mode: 'add' | 'edit', item?: any) => {
    setModalMode(mode);
    if (item) {
      const itemData = { ...item };
      if ((activeTab === 'events' || activeTab === 'achievements') && !itemData.images && itemData.image) {
        itemData.images = [itemData.image];
      }
      setFormData(itemData);
      setDeadlinePreset('custom');
    } else {
      setFormData({
        registration_enabled: true,
        registration_type: 'individual',
        min_team_size: 2,
        max_team_size: 5
      });
      setDeadlinePreset('3');
      // Set default deadline 3 days from now
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setFormData((prev: any) => ({ ...prev, registration_deadline: d.toISOString().slice(0, 16) }));
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleDeadlinePresetChange = (preset: string) => {
    setDeadlinePreset(preset);
    if (preset === 'none') {
      handleInputChange('registration_deadline', null);
    } else if (preset !== 'custom') {
      const days = parseInt(preset, 10);
      const d = new Date();
      d.setDate(d.getDate() + days);
      handleInputChange('registration_deadline', d.toISOString().slice(0, 16));
    }
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

      const { error: uploadError } = await supabase.storage
        .from('public_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('public_images').getPublicUrl(filePath);
      handleInputChange('image', data.publicUrl);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      alert('Error uploading image. Make sure the "public_images" bucket exists in Supabase Storage.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMultiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentImages: string[] = formData.images || [];
    if (currentImages.length >= 4) {
      alert('Maximum 4 images allowed.');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${activeTab}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('public_images').getPublicUrl(filePath);
      
      const newImages = [...currentImages, data.publicUrl];
      handleInputChange('images', newImages);
      if (!formData.image) {
        handleInputChange('image', data.publicUrl);
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      alert('Error uploading image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeMultiImage = (index: number) => {
    const currentImages: string[] = [...(formData.images || [])];
    currentImages.splice(index, 1);
    handleInputChange('images', currentImages);
    if (formData.image === (formData.images || [])[index]) {
      handleInputChange('image', currentImages[0] || '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };

      if (activeTab === 'events' || activeTab === 'achievements') {
        if (payload.images && payload.images.length > 0) {
          payload.image = payload.images[0];
        } else if (payload.image) {
          payload.images = [payload.image];
        }
      } else {
        delete payload.images;
      }

      if (activeTab === 'events') {
        if (!payload.status) payload.status = 'UPCOMING';
        if (payload.no_registration === undefined) payload.no_registration = false;
        if (payload.registration_enabled === undefined) payload.registration_enabled = true;
        if (payload.registration_type === undefined) payload.registration_type = 'individual';
        if (payload.start_date && !payload.date) {
          const sd = new Date(payload.start_date);
          const formatted = sd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          payload.date = payload.end_date && payload.end_date !== payload.start_date
            ? `${payload.start_date} – ${payload.end_date}`
            : formatted;
        }
      }

      if (activeTab === 'achievements') {
        if (!payload.category) payload.category = 'ACHIEVEMENT';
      }
      
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
      if (activeTab === 'events') fetchEventsList();
      fetchData(activeTab);
    } catch (err: any) {
      console.error('Error saving:', err);
      alert(`Error saving data: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleRowExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const exportEventRegistrationsCSV = () => {
    if (eventRegistrations.length === 0) {
      alert('No registrations available to export.');
      return;
    }

    const headers = [
      'Event', 'Type', 'Team Name', 'Leader Name', 'Leader Email', 'Leader Phone', 
      'Institution', 'Study Year', 'Members Count', 'All Members', 
      'Companion Present', 'Companion Name', 'Companion Role', 'Status', 'Registered At'
    ];

    const rows = eventRegistrations.map((item) => {
      const members = item.event_registration_members || [];
      const leader = members.find((m: any) => m.is_leader) || members[0] || {};
      const allMembersStr = members.map((m: any) => `${m.full_name} (${m.phone}, ${m.email})`).join(' | ');

      return [
        item.events?.title || `Event #${item.event_id}`,
        item.registration_type || 'individual',
        item.team_name || '—',
        leader.full_name || '—',
        leader.email || '—',
        leader.phone || '—',
        item.institution || '—',
        item.study_year || '—',
        members.length,
        allMembersStr,
        item.has_companion ? 'Yes' : 'No',
        item.companion_name || '—',
        item.companion_role || '—',
        item.status || 'pending',
        item.registered_at || ''
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erise_event_registrations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderFormFields = () => {
    return (
      <div className="space-y-4">
        {/* Name / Title */}
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

        {/* Single Image */}
        {(activeTab === 'leaders' || activeTab === 'star_members') && (
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
              <label className="bg-surface-elevated border border-subtle hover:border-accent cursor-pointer flex items-center justify-center px-4 rounded-lg transition-colors">
                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-accent" /> : <Upload className="w-5 h-5 text-secondary" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            {formData.image && (
              <div className="mt-2 h-32 w-32 rounded-lg border border-subtle overflow-hidden">
                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Multi Image */}
        {(activeTab === 'events' || activeTab === 'achievements') && (
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Images (up to 4) — first image is cover
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {((formData.images as string[]) || []).map((imgUrl: string, idx: number) => (
                <div key={idx} className="relative h-28 rounded-lg border border-subtle overflow-hidden group">
                  <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeMultiImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {((formData.images as string[]) || []).length < 4 && (
                <label className="h-28 rounded-lg border-2 border-dashed border-subtle hover:border-accent cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors bg-dominant/50">
                  {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-accent" /> : <Upload className="w-5 h-5 text-muted" />}
                  <span className="text-[10px] text-muted font-medium">Add Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleMultiImageUpload} />
                </label>
              )}
            </div>
          </div>
        )}

        {activeTab === 'leaders' && (
          <>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Role</label>
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
            </div>
          </>
        )}

        {activeTab === 'events' && (
          <>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.start_date || ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Time</label>
                <input
                  type="text"
                  placeholder="e.g. 8:30 AM - 1:00 PM"
                  value={formData.time || ''}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. RE2S School, Batna"
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Event Registration Setup Box */}
            <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 space-y-4 mt-2">
              <h4 className="text-sm font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Event Registration Settings
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-subtle bg-dominant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.registration_enabled ?? true}
                    onChange={(e) => handleInputChange('registration_enabled', e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-xs font-bold text-primary">Enable Event Registration Page</span>
                </label>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Registration Format</label>
                  <select
                    value={formData.registration_type || 'individual'}
                    onChange={(e) => handleInputChange('registration_type', e.target.value)}
                    className="w-full bg-dominant border border-subtle rounded-lg px-3 py-2 text-xs font-bold text-primary focus:border-accent focus:outline-none cursor-pointer"
                  >
                    <option value="individual">Individual Registration</option>
                    <option value="team">Team Registration</option>
                  </select>
                </div>
              </div>

              {/* Team Size options */}
              {formData.registration_type === 'team' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-subtle/50">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Min Team Size</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.min_team_size || 2}
                      onChange={(e) => handleInputChange('min_team_size', Number(e.target.value))}
                      className="w-full bg-dominant border border-subtle rounded-lg px-3 py-1.5 text-xs text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Max Team Size</label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={formData.max_team_size || 5}
                      onChange={(e) => handleInputChange('max_team_size', Number(e.target.value))}
                      className="w-full bg-dominant border border-subtle rounded-lg px-3 py-1.5 text-xs text-primary"
                    />
                  </div>
                </div>
              )}

              {/* Registration Deadline Presets */}
              <div className="pt-2 border-t border-subtle/50">
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  Registration Window / Timer Duration
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { id: '3', label: '3 Days' },
                    { id: '5', label: '5 Days' },
                    { id: '7', label: '7 Days' },
                    { id: 'custom', label: 'Custom Date' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleDeadlinePresetChange(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        deadlinePreset === p.id 
                          ? 'bg-accent text-white border-accent' 
                          : 'bg-dominant text-secondary border-subtle hover:border-accent/40'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {deadlinePreset === 'custom' && (
                  <div>
                    <label className="block text-[11px] text-muted mb-1">Set Exact Deadline Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.registration_deadline || ''}
                      onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                      className="w-full bg-dominant border border-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-accent"
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'achievements' && (
          <>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Year</label>
                <input
                  type="text"
                  placeholder="e.g. 2025"
                  value={formData.year || ''}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Category</label>
                <select
                  value={formData.category || 'ACHIEVEMENT'}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                >
                  <option value="ACHIEVEMENT">ACHIEVEMENT</option>
                  <option value="EVENT PARTICIPATION">EVENT PARTICIPATION</option>
                  <option value="AWARD">AWARD</option>
                  <option value="RECOGNITION">RECOGNITION</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full bg-dominant border border-subtle rounded-lg px-4 py-2 text-primary focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'star_members' && (
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
        )}
      </div>
    );
  };

  // ─── Event Registrations Tab View ─────────────────────────────────────────
  const renderEventRegistrationsTab = () => {
    const totalCount = eventRegistrations.length;
    const approvedCount = eventRegistrations.filter(r => r.status === 'approved').length;
    const pendingCount = eventRegistrations.filter(r => !r.status || r.status === 'pending').length;
    const rejectedCount = eventRegistrations.filter(r => r.status === 'rejected').length;

    return (
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="bg-surface border border-subtle rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Filter by Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                fetchEventRegistrations(e.target.value);
              }}
              className="w-full sm:w-72 bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-sm font-bold text-primary focus:border-accent focus:outline-none cursor-pointer"
            >
              <option value="all">All Events ({eventsList.length})</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-emerald-500">{approvedCount} Approved</span>
              <span className="text-amber-500">{pendingCount} Pending</span>
              <span className="text-red-400">{rejectedCount} Rejected</span>
            </div>
            {totalCount > 0 && (
              <button
                onClick={exportEventRegistrationsCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
          </div>
        </div>

        {/* List of Event Registrations */}
        {eventRegsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : eventRegistrations.length === 0 ? (
          <div className="bg-surface border border-subtle rounded-2xl p-12 text-center text-secondary">
            No event registrations found for this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {eventRegistrations.map((item) => {
              const isExpanded = expandedRows.has(item.id);
              const members: any[] = item.event_registration_members || [];
              const leader = members.find((m: any) => m.is_leader) || members[0] || {};
              const isTeam = item.registration_type === 'team';

              return (
                <div
                  key={item.id}
                  className="bg-surface border border-subtle rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Collapsed Header */}
                  <div 
                    onClick={() => toggleRowExpand(item.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-subtle/20 transition-colors"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase ${
                        isTeam ? 'bg-purple-500/15 text-purple-400' : 'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {isTeam ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-primary text-base">
                            {isTeam ? (item.team_name || 'Team Registration') : leader.full_name}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500' :
                            item.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {item.status || 'pending'}
                          </span>
                        </div>

                        <p className="text-xs text-muted mt-1">
                          Event: <strong className="text-primary">{item.events?.title || `#${item.event_id}`}</strong> · {item.institution} ({item.study_year})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-subtle">
                      <div className="flex items-center gap-2">
                        {item.has_companion && (
                          <span className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-bold flex items-center gap-1">
                            <Car className="w-3.5 h-3.5" /> Companion
                          </span>
                        )}
                        {isTeam && (
                          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-bold">
                            {members.length} Members
                          </span>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="border-t border-subtle bg-dominant/40 p-5 space-y-5">
                      {/* Companion Banner if present */}
                      {item.has_companion && (
                        <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 flex items-center gap-3 text-xs">
                          <Car className="w-5 h-5 text-accent shrink-0" />
                          <div>
                            <span className="block font-bold text-accent uppercase">Accompanying Companion</span>
                            <span className="text-primary font-medium">{item.companion_name}</span>
                            <span className="text-muted ml-2">({item.companion_role})</span>
                          </div>
                        </div>
                      )}

                      {/* Members Grid */}
                      <div>
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                          Registered Member(s) ({members.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {members.map((m: any, idx: number) => (
                            <div key={m.id || idx} className={`p-4 rounded-xl border ${m.is_leader ? 'bg-accent/5 border-accent/40' : 'bg-surface border-subtle'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-primary text-sm">{m.full_name}</span>
                                {m.is_leader && (
                                  <span className="px-2 py-0.5 rounded bg-accent text-white text-[9px] font-bold uppercase">Leader ⭐</span>
                                )}
                              </div>
                              <div className="space-y-1 text-xs text-muted">
                                <p><strong className="text-secondary">Email:</strong> <a href={`mailto:${m.email}`} className="text-accent hover:underline">{m.email}</a></p>
                                <p><strong className="text-secondary">Phone:</strong> <a href={`tel:${m.phone}`} className="text-primary">{m.phone}</a></p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-4 border-t border-subtle flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          {item.status !== 'approved' && (
                            <button
                              onClick={() => handleEventRegStatusChange(item.id, 'approved')}
                              className="px-3.5 py-1.5 rounded-lg text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" /> Approve
                            </button>
                          )}
                          {item.status !== 'rejected' && (
                            <button
                              onClick={() => handleEventRegStatusChange(item.id, 'rejected')}
                              className="px-3.5 py-1.5 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold border border-red-500/20 flex items-center gap-1.5 transition-colors"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                          )}
                          {item.status && item.status !== 'pending' && (
                            <button
                              onClick={() => handleEventRegStatusChange(item.id, 'pending')}
                              className="px-3.5 py-1.5 rounded-lg text-muted hover:text-primary text-xs font-medium transition-colors"
                            >
                              Reset to Pending
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteEventReg(item.id)}
                          className="px-3.5 py-1.5 rounded-lg text-red-500 hover:bg-red-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Registration
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── Intake Registrations Tab Content ────────────────────────────────────
  const renderRegistrationsTab = () => {
    const totalCount = data.length;
    const approvedCount = data.filter((r) => r.status === 'approved').length;
    const pendingCount = data.filter((r) => !r.status || r.status === 'pending').length;
    const rejectedCount = data.filter((r) => r.status === 'rejected').length;

    const filteredMembers = data.filter((item) => {
      const status = item.status || 'pending';
      if (memberStatusFilter !== 'all' && status !== memberStatusFilter) {
        return false;
      }
      if (memberSearchQuery.trim()) {
        const q = memberSearchQuery.toLowerCase();
        const depts = Array.isArray(item.departments) ? item.departments.join(' ') : (item.departments || '');
        const matchName = item.full_name?.toLowerCase().includes(q);
        const matchEmail = item.email?.toLowerCase().includes(q);
        const matchPhone = item.phone?.toLowerCase().includes(q);
        const matchSpec = item.specialization?.toLowerCase().includes(q);
        const matchDept = depts.toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchSpec || matchDept;
      }
      return true;
    });

    return (
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-surface border border-subtle rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-primary font-bold text-base flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-accent" /> Club Membership Intake Status
            </h3>
            <p className="text-sm text-muted mt-1">
              {registrationOpen ? 'Club intake form is currently OPEN for new student applications.' : 'Club intake form is currently CLOSED.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {totalCount > 0 && (
              <button
                onClick={exportClubRegistrationsCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
            <button
              onClick={toggleRegistration}
              disabled={togglingRegistration}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 ${
                registrationOpen
                  ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}
            >
              {togglingRegistration ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : registrationOpen ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
              {registrationOpen ? 'Intake Open' : 'Intake Closed'}
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member by name, email, phone, year, department..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full bg-dominant border border-subtle rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {memberSearchQuery && (
              <button
                onClick={() => setMemberSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: `All (${totalCount})` },
              { id: 'pending', label: `Pending (${pendingCount})`, color: 'text-amber-500' },
              { id: 'approved', label: `Approved (${approvedCount})`, color: 'text-emerald-500' },
              { id: 'rejected', label: `Rejected (${rejectedCount})`, color: 'text-red-400' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMemberStatusFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  memberStatusFilter === tab.id
                    ? 'bg-accent text-white shadow-md'
                    : 'bg-dominant text-secondary hover:bg-subtle/50 border border-subtle'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member List */}
        {dataLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-surface border border-subtle rounded-2xl p-12 text-center text-secondary">
            {memberSearchQuery || memberStatusFilter !== 'all'
              ? 'No member registrations match your search or filter.'
              : 'No club registrations found.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((item) => {
              const status = item.status || 'pending';
              const depts: string[] = Array.isArray(item.departments)
                ? item.departments
                : typeof item.departments === 'string'
                ? [item.departments]
                : [];

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedMember(item);
                    setMemberModalOpen(true);
                  }}
                  className="bg-surface border border-subtle hover:border-accent/50 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent font-bold flex items-center justify-center text-sm uppercase shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                      {item.full_name ? item.full_name.charAt(0) : 'M'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-primary text-base group-hover:text-accent transition-colors">
                          {item.full_name}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : status === 'rejected'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <p className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
                        <span>Year {item.study_year}</span>
                        {item.specialization && <span>· {item.specialization}</span>}
                        <span>· {item.email}</span>
                        <span>· {item.phone}</span>
                      </p>

                      {depts.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {depts.map((d) => (
                            <span key={d} className="px-2 py-0.5 rounded-md bg-subtle/40 text-[10px] font-semibold text-secondary">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between md:justify-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-subtle"
                  >
                    <span className="text-[11px] font-medium text-accent hover:underline hidden sm:inline mr-2">
                      Click for details & actions →
                    </span>

                    {status !== 'approved' && (
                      <button
                        onClick={() => handleMemberStatusChange(item.id, 'approved')}
                        disabled={statusUpdatingId === item.id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Accept / Approve Member"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Accept</span>
                      </button>
                    )}

                    {status !== 'rejected' && (
                      <button
                        onClick={() => handleMemberStatusChange(item.id, 'rejected')}
                        disabled={statusUpdatingId === item.id}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Reject Member"
                      >
                        <XCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reject</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteMember(item.id, item.full_name)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                      title="Delete Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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

  const sidebarTabs = [
    { key: 'leaders', label: 'Leaders', icon: Users },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'event_registrations', label: 'Event Registrations', icon: UserCheck },
    { key: 'achievements', label: 'Achievements', icon: Award },
    { key: 'star_members', label: 'Star Members', icon: Star },
    { key: 'registrations', label: 'Club Intake', icon: ClipboardList },
  ] as const;

  return (
    <div className="min-h-screen bg-dominant flex flex-col relative">
      {/* Header */}
      <header className="bg-surface border-b border-subtle p-4 px-4 sm:px-8 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-dominant text-primary border border-subtle"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-primary">E.R.I.S.E. Admin</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs sm:text-sm font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Horizontal Scrollable Tabs for Mobile Screens */}
      <div className="lg:hidden bg-surface border-b border-subtle px-4 py-2 overflow-x-auto flex gap-2 no-scrollbar">
        {sidebarTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                isActive ? 'bg-accent text-white shadow-md' : 'text-secondary hover:bg-subtle/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 bg-surface border-r border-subtle p-4 flex-col gap-2 z-10 shrink-0">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-3 ${
                  isActive ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-secondary hover:bg-subtle/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-8 relative">
          {activeTab === 'event_registrations' ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-primary">Event Registrations</h2>
                <p className="text-xs sm:text-sm text-muted">Manage participant and team registrations per event.</p>
              </div>
              {renderEventRegistrationsTab()}
            </>
          ) : activeTab === 'registrations' ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-primary">Club Intake Registrations</h2>
              </div>
              {renderRegistrationsTab()}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-primary capitalize">{activeTab.replace('_', ' ')} Management</h2>
                </div>
                <button 
                  onClick={() => openModal('add')}
                  className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl hover:bg-accent-muted transition-colors shadow-lg shadow-accent/20 font-bold text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4" /> Add New
                </button>
              </div>

              {dataLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : (
                <div className="bg-surface border border-subtle rounded-2xl overflow-hidden shadow-sm">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-subtle/30 text-secondary text-xs uppercase">
                        <tr>
                          <th className="px-6 py-4 font-medium w-16">ID</th>
                          <th className="px-6 py-4 font-medium w-24">Image</th>
                          <th className="px-6 py-4 font-medium">Name/Title</th>
                          <th className="px-6 py-4 font-medium w-32">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle text-sm">
                        {data.map((item) => (
                          <tr key={item.id} className="hover:bg-subtle/20 transition-colors">
                            <td className="px-6 py-4 text-primary font-bold">{item.id}</td>
                            <td className="px-6 py-4">
                              {item.image ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-subtle">
                                  <img src={item.image} alt="Thumbnail" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-dominant border border-subtle flex items-center justify-center text-[10px] text-muted">None</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-primary font-medium">{item.name || item.title}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openModal('edit', item)} className="text-blue-400 p-2 hover:bg-blue-500/10 rounded-lg">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="text-red-400 p-2 hover:bg-red-500/10 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden divide-y divide-subtle">
                    {data.map((item) => (
                      <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.image ? (
                            <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover border border-subtle shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-dominant border border-subtle shrink-0 flex items-center justify-center text-[10px] text-muted">No Image</div>
                          )}
                          <div className="min-w-0">
                            <span className="block font-bold text-primary text-sm truncate">{item.name || item.title}</span>
                            <span className="block text-xs text-muted">ID: {item.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openModal('edit', item)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface border border-subtle rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-subtle flex justify-between items-center bg-dominant/30">
              <h3 className="text-lg sm:text-xl font-bold text-primary capitalize">{modalMode} {activeTab.replace('_', ' ')}</h3>
              <button onClick={closeModal} className="p-2 text-secondary hover:bg-subtle/50 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <form id="crud-form" onSubmit={handleSave}>
                {renderFormFields()}
              </form>
            </div>
            <div className="p-4 sm:p-6 border-t border-subtle flex justify-end gap-3 bg-dominant/50">
              <button 
                type="button" 
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-secondary hover:bg-subtle/50 transition-colors"
              >
                Cancel
              </button>
              <button 
                form="crud-form"
                type="submit"
                disabled={saving || uploadingImage}
                className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-accent text-white hover:bg-accent-muted transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Member Detail Panel Modal */}
      {memberModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface border border-subtle rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-subtle flex justify-between items-center bg-dominant/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent font-bold flex items-center justify-center text-lg uppercase shrink-0">
                  {selectedMember.full_name ? selectedMember.full_name.charAt(0) : 'M'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-primary truncate">{selectedMember.full_name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      selectedMember.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' :
                      selectedMember.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {selectedMember.status || 'pending'}
                    </span>
                  </div>
                  <p className="text-xs text-muted">Member ID: #{selectedMember.id}</p>
                </div>
              </div>
              <button 
                onClick={() => { setMemberModalOpen(false); setSelectedMember(null); }}
                className="p-2 text-secondary hover:bg-subtle/50 rounded-xl transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">Contact Details</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-dominant border border-subtle">
                    <div className="flex items-center gap-3 min-w-0">
                      <Mail className="w-4 h-4 text-accent shrink-0" />
                      <a href={`mailto:${selectedMember.email}`} className="text-sm font-medium text-primary hover:text-accent truncate">
                        {selectedMember.email}
                      </a>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedMember.email, 'email')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-subtle hover:border-accent text-xs font-medium text-secondary transition-colors shrink-0"
                      title="Copy Email"
                    >
                      {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-dominant border border-subtle">
                    <div className="flex items-center gap-3 min-w-0">
                      <Phone className="w-4 h-4 text-accent shrink-0" />
                      <a href={`tel:${selectedMember.phone}`} className="text-sm font-medium text-primary hover:text-accent truncate">
                        {selectedMember.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`https://wa.me/${selectedMember.phone?.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        title="WhatsApp"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(selectedMember.phone, 'phone')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-subtle hover:border-accent text-xs font-medium text-secondary transition-colors"
                        title="Copy Phone"
                      >
                        {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'phone' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Background */}
              <div>
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">Academic Background</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-dominant border border-subtle">
                    <span className="block text-xs text-muted mb-0.5">Study Year</span>
                    <span className="font-bold text-primary text-sm flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-accent" /> Year {selectedMember.study_year}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-dominant border border-subtle">
                    <span className="block text-xs text-muted mb-0.5">Specialization</span>
                    <span className="font-bold text-primary text-sm">
                      {selectedMember.specialization || 'N/A (1st/2nd Year)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Departments */}
              <div>
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">Selected Department(s)</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedMember.departments) && selectedMember.departments.length > 0 ? (
                    selectedMember.departments.map((d: string) => (
                      <span key={d} className="px-3 py-1 rounded-xl bg-accent/10 border border-accent/20 text-accent font-bold text-xs">
                        {d}
                      </span>
                    ))
                  ) : typeof selectedMember.departments === 'string' && selectedMember.departments ? (
                    <span className="px-3 py-1 rounded-xl bg-accent/10 border border-accent/20 text-accent font-bold text-xs">
                      {selectedMember.departments}
                    </span>
                  ) : (
                    <span className="text-xs text-muted italic">No department selected</span>
                  )}
                </div>
              </div>

              {/* Registration Date */}
              {selectedMember.registered_at && (
                <div className="text-xs text-muted pt-2 border-t border-subtle flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted" />
                  <span>Registered on: {formatDate(selectedMember.registered_at)}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 border-t border-subtle bg-dominant/50 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  onClick={() => copyAllMemberInfo(selectedMember)}
                  className="px-3.5 py-2 rounded-xl bg-surface border border-subtle hover:border-accent text-xs font-bold text-primary flex items-center gap-1.5 transition-colors"
                >
                  {copiedField === 'all' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedField === 'all' ? 'Info Copied!' : 'Copy All Info'}</span>
                </button>

                <button
                  onClick={() => handleDeleteMember(selectedMember.id, selectedMember.full_name)}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Member
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-subtle/50">
                <button
                  onClick={() => handleMemberStatusChange(selectedMember.id, 'approved')}
                  disabled={statusUpdatingId === selectedMember.id || selectedMember.status === 'approved'}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                    selectedMember.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 opacity-70 cursor-default'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                  }`}
                >
                  {statusUpdatingId === selectedMember.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {selectedMember.status === 'approved' ? 'Approved' : 'Accept / Approve'}
                </button>

                <button
                  onClick={() => handleMemberStatusChange(selectedMember.id, 'rejected')}
                  disabled={statusUpdatingId === selectedMember.id || selectedMember.status === 'rejected'}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                    selectedMember.status === 'rejected'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 opacity-70 cursor-default'
                      : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                  }`}
                >
                  {statusUpdatingId === selectedMember.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {selectedMember.status === 'rejected' ? 'Rejected' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
