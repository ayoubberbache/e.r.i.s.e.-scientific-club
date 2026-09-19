import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  User, LogIn, LogOut, Loader2, Save, Trash2, Plus, X, Upload, Edit, 
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, ClipboardList, Users, 
  Award, Calendar, Star, Download, CheckCircle, XCircle, Menu, Car, 
  Building2, UserCheck, Clock, Filter, FileText, Check, Copy, Phone, 
  Mail, GraduationCap, Search, ExternalLink, Cpu, Camera, Building,
  ShieldCheck, Wrench, Film, Layers, Sparkles, Lock, Eye, EyeOff, KeyRound
} from 'lucide-react';
import { authenticateUser, DEPARTMENT_HEADS, SUPER_ADMIN_CONFIG } from '../data/departmentHeads';
import { Department, UserRole, DepartmentHeadUser } from '../types/portals';
import { OrganizationPortal } from '../components/portals/OrganizationPortal';
import { MediaPortal } from '../components/portals/MediaPortal';
import { ProjectsPortal } from '../components/portals/ProjectsPortal';
import { 
  getValidAuthSession, 
  saveAuthSession, 
  clearAuthSession, 
  clearLegacySessions,
  verifyPasswordHash
} from '../lib/authCrypto';

// Configuration toggle to mask/hide Projects, Organization, and Media portals from Super Admin panel
const MASK_PORTAL_BUTTONS = false;

const getAdminAuthHeaders = (): Record<string, string> => {
  const session = getValidAuthSession();
  if (!session) return { 'Content-Type': 'application/json' };
  try {
    const tokenStr = btoa(unescape(encodeURIComponent(JSON.stringify(session))));
    return {
      'Authorization': `Bearer ${tokenStr}`,
      'Content-Type': 'application/json'
    };
  } catch (e) {
    return { 'Content-Type': 'application/json' };
  }
};

export function AdminDashboard() {
  const { portalSlug } = useParams<{ portalSlug?: string }>();
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<DepartmentHeadUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setTimeout(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutSeconds]);
  
  const [activeTab, setActiveTab] = useState<
    'leaders' | 'events' | 'event_registrations' | 'achievements' | 'star_members' | 'registrations' | 'portal_projects' | 'portal_organization' | 'portal_media'
  >('leaders');
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

  // Form Language Mode for Bilingual Admin Editing
  const [formLang, setFormLang] = useState<'both' | 'en' | 'ar'>('both');

  // Member Detail Panel & Intake Filter State
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState<boolean>(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  
  // Email Automation State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailType, setEmailType] = useState<'meeting' | 'acceptance' | 'event_invitation' | 'event_acceptance'>('meeting');
  const [emailSendingLoading, setEmailSendingLoading] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [targetRecipientName, setTargetRecipientName] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('Batna Campus');
  const [meetingDateTime, setMeetingDateTime] = useState('Tomorrow at 10:00 AM');
  const [acceptanceDepts, setAcceptanceDepts] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);


  const handleMemberStatusChange = async (id: number, newStatus: 'approved' | 'rejected' | 'pending') => {
    setStatusUpdatingId(id);
    try {
      const authHeaders = getAdminAuthHeaders();
      let updated = false;

      try {
        const res = await fetch('/api/admin-data', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            action: 'update_status',
            table: 'registrations',
            id,
            status: newStatus
          })
        });
        if (res.ok) updated = true;
      } catch (e) {}

      if (!updated) {
        const { error } = await supabase
          .from('registrations')
          .update({ status: newStatus })
          .eq('id', id);

        if (error) throw error;
      }

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

  const handleSendEmailSubmit = async () => {
    const recipientEmail = targetEmail || selectedMember?.email;
    const recipientName = targetRecipientName || selectedMember?.full_name;

    if (!recipientEmail || !recipientName) return;
    setEmailSendingLoading(true);
    setEmailErrorMsg(null);
    setEmailSuccessMsg(null);

    try {
      const payload = {
        type: emailType,
        email: recipientEmail,
        name: recipientName,
        departments: acceptanceDepts,
        location: meetingLocation,
        dateTime: meetingDateTime,
        eventTitle: eventTitle,
        notes: eventNotes,
      };

      const res = await fetch('/api/send-recruitment-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let resData: any = null;
      try {
        const text = await res.text();
        resData = text ? JSON.parse(text) : null;
      } catch {
        resData = null;
      }

      if (!res.ok) {
        throw new Error(
          resData?.error || 
          resData?.details?.message || 
          `Server returned status ${res.status}: ${res.statusText || 'Email service unavailable'}`
        );
      }

      setEmailSuccessMsg(`Email sent successfully to ${recipientEmail}!`);
      if (emailType === 'acceptance' && selectedMember && selectedMember.status !== 'approved') {
        handleMemberStatusChange(selectedMember.id, 'approved');
      }
    } catch (err: any) {
      console.error('Email sending error:', err);
      setEmailErrorMsg(err.message || 'Failed to send email');
    } finally {
      setEmailSendingLoading(false);
    }
  };

  const handleDeleteMember = async (id: number, name?: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name || 'this member'}?`)) return;
    try {
      const authHeaders = getAdminAuthHeaders();
      let deleted = false;

      try {
        const res = await fetch('/api/admin-data', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            action: 'delete',
            table: 'registrations',
            id
          })
        });
        if (res.ok) deleted = true;
      } catch (e) {}

      if (!deleted) {
        const { error } = await supabase.from('registrations').delete().eq('id', id);
        if (error) throw error;
      }

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
    // Instantly wipe all legacy insecure sessions from all devices
    clearLegacySessions();

    const validSession = getValidAuthSession();
    if (validSession) {
      setIsAuthenticated(true);
      setUserRole(validSession.user.role);
      setCurrentUser(validSession.user);

      if (validSession.user.role === 'admin') {
        fetchRegistrationStatus();
        fetchEventsList();
        if (!portalSlug) {
          navigate('/admin/super', { replace: true });
        }
      } else if (validSession.user.role === 'head_projects') {
        if (portalSlug !== 'projects') {
          navigate('/admin/projects', { replace: true });
        }
      } else if (validSession.user.role === 'head_organization') {
        if (portalSlug !== 'organization') {
          navigate('/admin/organization', { replace: true });
        }
      } else if (validSession.user.role === 'head_media') {
        if (portalSlug !== 'media') {
          navigate('/admin/media', { replace: true });
        }
      }
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
      setCurrentUser(null);
    }
  }, [portalSlug, navigate]);

  useEffect(() => {
    if (MASK_PORTAL_BUTTONS && activeTab.startsWith('portal_')) {
      setActiveTab('leaders');
      return;
    }

    if (isAuthenticated && (!userRole || userRole === 'admin')) {
      if (activeTab === 'event_registrations') {
        fetchEventsList();
        fetchEventRegistrations(selectedEventId);
      } else if (!activeTab.startsWith('portal_')) {
        fetchData(activeTab);
      }
    }
  }, [activeTab, isAuthenticated, userRole]);

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
      const authHeaders = getAdminAuthHeaders();
      let fetched = false;

      try {
        const res = await fetch(`/api/admin-data?table=event_registrations&eventId=${eventIdFilter}`, {
          headers: authHeaders
        });
        if (res.ok) {
          const json = await res.json();
          setEventRegistrations(json.data || []);
          fetched = true;
        }
      } catch (e) {}

      if (!fetched) {
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
      }
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
      const authHeaders = getAdminAuthHeaders();
      let updated = false;

      // 1. Prioritize secure admin proxy (bypasses RLS with secret key)
      try {
        const res = await fetch('/api/admin-data', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            action: 'toggle_registration',
            value: newValue,
            payload: { value: newValue }
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) updated = true;
        }
      } catch (err) {
        console.warn('Admin proxy toggle failed, trying direct:', err);
      }

      // 2. Direct client fallback
      if (!updated) {
        const { error } = await supabase
          .from('site_settings')
          .upsert({ key: 'registration_open', value: String(newValue), updated_at: new Date().toISOString() });
        if (error) throw error;
      }

      setRegistrationOpen(newValue);
    } catch (err: any) {
      console.error('Error toggling registration:', err);
      alert('Failed to toggle registration status: ' + (err.message || 'Error'));
    } finally {
      setTogglingRegistration(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) {
      setError(`Login temporarily locked. Please wait ${lockoutSeconds} seconds.`);
      return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. Check local authentication helper for department heads & super admin (cryptographic salted hash verification)
      const localAuth = await authenticateUser(username, password);
      if (localAuth) {
        setFailedAttempts(0);
        setPassword('');
        await saveAuthSession(localAuth);
        setIsAuthenticated(true);
        setUserRole(localAuth.role);
        setCurrentUser(localAuth);

        if (localAuth.role === 'admin') {
          fetchRegistrationStatus();
          fetchEventsList();
          navigate('/admin/super');
        } else if (localAuth.role === 'head_projects') {
          navigate('/admin/projects');
        } else if (localAuth.role === 'head_organization') {
          navigate('/admin/organization');
        } else if (localAuth.role === 'head_media') {
          navigate('/admin/media');
        }
        return;
      }

      // 2. Fallback to Supabase admin_users table (if DB-managed admin exists)
      if (username.trim()) {
        const { data, error: dbErr } = await supabase
          .from('admin_users')
          .select('*')
          .eq('username', username.trim())
          .single();

        if (data && !dbErr) {
          const isMatch = await verifyPasswordHash(password.trim(), SUPER_ADMIN_CONFIG.salt, data.password);
          if (isMatch || password.trim() === data.password) {
            setFailedAttempts(0);
            setPassword('');
            const adminUser: DepartmentHeadUser = {
              id: 'admin-' + data.id,
              name: 'E.R.I.S.E. Administrator',
              username: data.username,
              role: 'admin',
              roleTitle: 'Club Administrator',
              department: 'All',
              email: 'erise.club@gmail.com',
            };
            await saveAuthSession(adminUser);
            setIsAuthenticated(true);
            setUserRole('admin');
            setCurrentUser(adminUser);
            fetchRegistrationStatus();
            fetchEventsList();
            navigate('/admin/super');
            return;
          }
        }
      }

      // Failed attempt: increment counter, wipe password input field
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setPassword('');

      if (newAttempts >= 5) {
        setLockoutSeconds(30);
        setError('Security Lockout: 5 failed attempts. Login disabled for 30 seconds.');
      } else if (newAttempts >= 3) {
        setError(`Invalid credentials. ${5 - newAttempts} attempt(s) remaining before security lockout.`);
      } else {
        setError('Invalid credentials. Please verify your password.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
    navigate('/admin');
  };

  const fetchData = async (table: string) => {
    setDataLoading(true);
    try {
      if (table === 'registrations') {
        const authHeaders = getAdminAuthHeaders();
        try {
          const res = await fetch('/api/admin-data?table=registrations', {
            headers: authHeaders
          });
          if (res.ok) {
            const json = await res.json();
            setData(json.data || []);
            return;
          }
        } catch (e) {}
      }

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
      let deleted = false;
      try {
        const authHeaders = getAdminAuthHeaders();
        const res = await fetch('/api/admin-data', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ action: 'delete', table: activeTab, id })
        });
        if (res.ok) deleted = true;
      } catch (e) {}

      if (!deleted) {
        const { error } = await supabase.from(activeTab).delete().eq('id', id);
        if (error) throw error;
      }
      fetchData(activeTab);
    } catch (err: any) {
      alert(`Error deleting item: ${err.message || err}`);
    }
  };

  const handleDeleteEventReg = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this event registration?')) return;
    try {
      let deleted = false;
      try {
        const authHeaders = getAdminAuthHeaders();
        const res = await fetch('/api/admin-data', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ action: 'delete', table: 'event_registrations', id })
        });
        if (res.ok) deleted = true;
      } catch (e) {}

      if (!deleted) {
        const { error } = await supabase.from('event_registrations').delete().eq('id', id);
        if (error) throw error;
      }
      fetchEventRegistrations(selectedEventId);
    } catch (err: any) {
      alert(`Error deleting event registration: ${err.message || err}`);
    }
  };

  const handleEventRegStatusChange = async (id: number, newStatus: string) => {
    try {
      let updated = false;
      try {
        const authHeaders = getAdminAuthHeaders();
        const res = await fetch('/api/admin-data', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ action: 'update_status', table: 'event_registrations', id, status: newStatus })
        });
        if (res.ok) updated = true;
      } catch (e) {}

      if (!updated) {
        const { error } = await supabase.from('event_registrations').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
      }
      setEventRegistrations(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch (err: any) {
      alert(`Failed to update event registration status: ${err.message || err}`);
    }
  };

  const openModal = (mode: 'add' | 'edit', item?: any) => {
    setModalMode(mode);
    if (item) {
      const itemData = { ...item };
      if ((activeTab === 'events' || activeTab === 'achievements') && !itemData.images && itemData.image) {
        itemData.images = [itemData.image];
      }
      if (activeTab === 'events' && itemData.registration_type) {
        if (itemData.registration_type.startsWith('custom')) {
          const parts = itemData.registration_type.split(':');
          itemData.custom_event_type = parts.slice(1).join(':').trim();
          itemData.registration_type = 'custom';
        }
      }
      setFormData(itemData);
      setDeadlinePreset('custom');
    } else {
      if (activeTab === 'events') {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        setFormData({
          registration_enabled: true,
          registration_type: 'individual',
          custom_event_type: '',
          min_team_size: 2,
          max_team_size: 5,
          registration_deadline: d.toISOString().slice(0, 16)
        });
        setDeadlinePreset('3');
      } else {
        setFormData({});
      }
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
        if (payload.registration_type === 'custom') {
          payload.registration_type = payload.custom_event_type?.trim()
            ? `custom:${payload.custom_event_type.trim()}`
            : 'custom';
        }
        delete payload.custom_event_type;
        if (payload.start_date && !payload.date) {
          const sd = new Date(payload.start_date);
          const formatted = sd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          payload.date = payload.end_date && payload.end_date !== payload.start_date
            ? `${payload.start_date} – ${payload.end_date}`
            : formatted;
        }
      } else {
        delete payload.custom_event_type;
        delete payload.registration_enabled;
        delete payload.registration_type;
        delete payload.min_team_size;
        delete payload.max_team_size;
        delete payload.no_registration;
        delete payload.registration_deadline;
        delete payload.start_date;
        delete payload.end_date;
        delete payload.status;
      }

      if (activeTab === 'achievements') {
        if (!payload.category) payload.category = 'ACHIEVEMENT';
      }
      
      if (modalMode === 'add') {
        delete payload.id;
        delete payload.created_at;
        let inserted = false;
        try {
          const { error } = await supabase.from(activeTab).insert([payload]);
          if (!error) inserted = true;
        } catch (e) {}

        if (!inserted) {
          const authHeaders = getAdminAuthHeaders();
          const res = await fetch('/api/admin-data', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ action: 'save_item', table: activeTab, item: payload })
          });
          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to save item');
          }
        }
      } else {
        const { id, created_at, ...updatePayload } = payload;
        let updated = false;
        try {
          const { error } = await supabase.from(activeTab).update(updatePayload).eq('id', id);
          if (!error) updated = true;
        } catch (e) {}

        if (!updated) {
          const authHeaders = getAdminAuthHeaders();
          const res = await fetch('/api/admin-data', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ action: 'save_item', table: activeTab, item: updatePayload, id })
          });
          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to update item');
          }
        }
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
      'Event', 'Type', 'Student ID', 'Team Name', 'Leader Name', 'Leader Email', 'Leader Phone', 
      'Institution', 'Study Year', 'Members Count', 'All Members', 
      'Companion Present', 'Companion Name', 'Companion Role', 'Status', 'Registered At'
    ];

    const rows = eventRegistrations.map((item) => {
      const members = item.event_registration_members || [];
      const leader = members.find((m: any) => m.is_leader) || members[0] || {};
      const allMembersStr = members.map((m: any) => `${m.full_name} (${m.phone}, ${m.email})`).join(' | ');
      const studentIdMatch = item.institution?.match(/\[ID:\s*(\d+)\]/) || item.companion_role?.match(/Student ID:\s*(\d+)/) || item.team_name?.match(/Student ID:\s*(\d+)/);
      const studentId = studentIdMatch ? studentIdMatch[1] : '—';

      return [
        item.events?.title || `Event #${item.event_id}`,
        item.registration_type || 'individual',
        studentId,
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
    const isLeaders = activeTab === 'leaders';
    const isStar = activeTab === 'star_members';
    const isEvents = activeTab === 'events';
    const isAchievements = activeTab === 'achievements';

    return (
      <div className="space-y-4">
        {/* Language Tabs Selector */}
        <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Editing Language:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setFormLang('both')}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                formLang === 'both'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Both (EN & AR)
            </button>
            <button
              type="button"
              onClick={() => setFormLang('en')}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                formLang === 'en'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setFormLang('ar')}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                formLang === 'ar'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              العربية
            </button>
          </div>
        </div>

        {/* Name / Title (Bilingual) */}
        <div className="space-y-3">
          {(formLang === 'both' || formLang === 'en') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{isLeaders || isStar ? 'Full Name' : 'Title'} (English) <span className="text-red-500">*</span></span>
                <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5">EN</span>
              </label>
              <input
                type="text"
                required
                value={formData.name || formData.title || ''}
                onChange={(e) => handleInputChange(isLeaders || isStar ? 'name' : 'title', e.target.value)}
                placeholder={isLeaders || isStar ? 'e.g. John Doe' : 'e.g. Green Hydrogen Workshop'}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          )}

          {(formLang === 'both' || formLang === 'ar') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{isLeaders || isStar ? 'الاسم واللقب' : 'العنوان'} (بالعربية)</span>
                <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5">AR</span>
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.name_ar || formData.title_ar || ''}
                onChange={(e) => handleInputChange(isLeaders || isStar ? 'name_ar' : 'title_ar', e.target.value)}
                placeholder={isLeaders || isStar ? 'مثال: أحمد بن علي' : 'مثال: ورشة عمل الهيدروجين الأخضر'}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
              />
            </div>
          )}
        </div>

        {/* Single Image for Leaders & Star Members */}
        {(isLeaders || isStar) && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Image URL or Upload</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.image || ''}
                onChange={(e) => handleInputChange('image', e.target.value)}
                placeholder="https://... or click upload ->"
                className="flex-1 bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
              />
              <label className="bg-slate-100 border border-slate-300 hover:border-slate-800 cursor-pointer flex items-center justify-center px-4 transition-colors">
                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-slate-700" /> : <Upload className="w-5 h-5 text-slate-600" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            {formData.image && (
              <div className="mt-2 h-28 w-28 border border-slate-300 overflow-hidden bg-slate-100">
                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Multi Image for Events & Achievements */}
        {(isEvents || isAchievements) && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Images (up to 4) — First image is used as cover
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {((formData.images as string[]) || []).map((imgUrl: string, idx: number) => (
                <div key={idx} className="relative h-28 border border-slate-300 overflow-hidden group bg-slate-100">
                  <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeMultiImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {((formData.images as string[]) || []).length < 4 && (
                <label className="h-28 border-2 border-dashed border-slate-300 hover:border-slate-800 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors bg-slate-50">
                  {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-slate-700" /> : <Upload className="w-5 h-5 text-slate-400" />}
                  <span className="text-[10px] text-slate-500 font-medium">Add Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleMultiImageUpload} />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Leaders Specific Fields (Role, Specialty, Bio, Socials) */}
        {isLeaders && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(formLang === 'both' || formLang === 'en') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Role / Position (EN) <span className="text-red-500">*</span></span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">EN</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.role || ''}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    placeholder="e.g. Club President"
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {(formLang === 'both' || formLang === 'ar') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>المنصب / الصفة (AR)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">AR</span>
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.role_ar || ''}
                    onChange={(e) => handleInputChange('role_ar', e.target.value)}
                    placeholder="مثال: رئيس النادي"
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(formLang === 'both' || formLang === 'en') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Specialty / Status (EN)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">EN</span>
                  </label>
                  <input
                    type="text"
                    value={formData.specialty || ''}
                    onChange={(e) => handleInputChange('specialty', e.target.value)}
                    placeholder="e.g. Renewable Energy Engineer"
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {(formLang === 'both' || formLang === 'ar') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>التخصص / الحالة (AR)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">AR</span>
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.specialty_ar || ''}
                    onChange={(e) => handleInputChange('specialty_ar', e.target.value)}
                    placeholder="مثال: مهندس طاقات متجددة"
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              {(formLang === 'both' || formLang === 'en') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Bio / Summary (EN)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">EN</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Brief leader bio..."
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {(formLang === 'both' || formLang === 'ar') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>نبذة تعريفية (AR)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">AR</span>
                  </label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={formData.bio_ar || ''}
                    onChange={(e) => handleInputChange('bio_ar', e.target.value)}
                    placeholder="نبذة مختصرة عن القائد..."
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.socials?.linkedin || ''}
                  onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={formData.socials?.github || ''}
                  onChange={(e) => handleSocialChange('github', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  placeholder="https://github.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.socials?.mail || ''}
                  onChange={(e) => handleSocialChange('mail', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </>
        )}

        {/* Events Specific Fields */}
        {isEvents && (
          <>
            <div className="space-y-3">
              {(formLang === 'both' || formLang === 'en') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Description (English)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">EN</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Event description in English..."
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {(formLang === 'both' || formLang === 'ar') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>وصف الفعالية (بالعربية)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">AR</span>
                  </label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={formData.description_ar || ''}
                    onChange={(e) => handleInputChange('description_ar', e.target.value)}
                    placeholder="تفاصيل ووصف الفعالية باللغة العربية..."
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.start_date || ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(formLang === 'both' || formLang === 'en') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Time (EN)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">EN</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 AM - 04:00 PM"
                    value={formData.time || ''}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {(formLang === 'both' || formLang === 'ar') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>التوقيت (AR)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">AR</span>
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: من 09:00 صباحاً إلى 04:00 مساءً"
                    value={formData.time_ar || ''}
                    onChange={(e) => handleInputChange('time_ar', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(formLang === 'both' || formLang === 'en') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Location (EN)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">EN</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium, Batna"
                    value={formData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {(formLang === 'both' || formLang === 'ar') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>المكان (AR)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">AR</span>
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: قاعة المحاضرات الكبرى، باتنة"
                    value={formData.location_ar || ''}
                    onChange={(e) => handleInputChange('location_ar', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
                  />
                </div>
              )}
            </div>

            {/* Event Registration Setup Box */}
            <div className="p-4 border border-slate-300 bg-slate-50 space-y-4 mt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-slate-700" /> Event Registration Settings
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 border border-slate-300 bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.registration_enabled ?? true}
                    onChange={(e) => handleInputChange('registration_enabled', e.target.checked)}
                    className="w-4 h-4 accent-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-900">Enable Registration Form</span>
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registration Format</label>
                  <select
                    value={formData.registration_type || 'individual'}
                    onChange={(e) => handleInputChange('registration_type', e.target.value)}
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="hackathon">Hackathon / Ideathon (Team or Solo)</option>
                    <option value="workshop">Bootcamp / Workshop (12-Digit Student ID)</option>
                    <option value="custom">Custom Event</option>
                    <option value="individual">Standard Individual Registration</option>
                    <option value="team">Standard Team Only Registration</option>
                  </select>
                </div>
              </div>

              {/* Custom Event Category Name */}
              {formData.registration_type === 'custom' && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Event Category / Title *
                  </label>
                  <input
                    type="text"
                    value={formData.custom_event_type || ''}
                    onChange={(e) => handleInputChange('custom_event_type', e.target.value)}
                    placeholder="e.g., Panel Discussion, Exhibition, Scientific Forum..."
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Specify what type of custom event this is.</p>
                </div>
              )}

              {/* Team Size options for team and hackathon */}
              {(formData.registration_type === 'team' || formData.registration_type === 'hackathon') && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {formData.registration_type === 'hackathon' ? 'Min Team Size (if team)' : 'Min Team Size'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.min_team_size || 2}
                      onChange={(e) => handleInputChange('min_team_size', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {formData.registration_type === 'hackathon' ? 'Max Team Size (if team)' : 'Max Team Size'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={formData.max_team_size || 5}
                      onChange={(e) => handleInputChange('max_team_size', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Registration Deadline Presets */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                      className={`px-3 py-1.5 text-xs font-bold transition-all border ${
                        deadlinePreset === p.id 
                          ? 'bg-slate-900 text-white border-slate-900' 
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {deadlinePreset === 'custom' && (
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Set Exact Deadline Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.registration_deadline || ''}
                      onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                      className="w-full bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-800"
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Achievements Specific Fields */}
        {isAchievements && (
          <>
            <div className="space-y-3">
              {(formLang === 'both' || formLang === 'en') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Description (English)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">EN</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Achievement details in English..."
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {(formLang === 'both' || formLang === 'ar') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>تفاصيل الإنجاز (بالعربية)</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">AR</span>
                  </label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={formData.description_ar || ''}
                    onChange={(e) => handleInputChange('description_ar', e.target.value)}
                    placeholder="تفاصيل وقصة هذا الإنجاز باللغة العربية..."
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                <input
                  type="text"
                  placeholder="e.g. 2025"
                  value={formData.year || ''}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category (EN)</label>
                <select
                  value={formData.category || 'ACHIEVEMENT'}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="ACHIEVEMENT">ACHIEVEMENT</option>
                  <option value="EVENT PARTICIPATION">EVENT PARTICIPATION</option>
                  <option value="AWARD">AWARD</option>
                  <option value="RECOGNITION">RECOGNITION</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {(formLang === 'both' || formLang === 'ar') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>الفئة أو التصنيف بالعربية</span>
                  <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">AR</span>
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: تكريم وجائزة تقديرية"
                  value={formData.category_ar || ''}
                  onChange={(e) => handleInputChange('category_ar', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
                />
              </div>
            )}
          </>
        )}

        {/* Star Members Specific Fields (Organization EN & AR) */}
        {isStar && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Departments (English Tags)</label>
              <div className="flex flex-wrap gap-3">
                {['Projects', 'Organization', 'Media'].map((dept) => {
                  const currentOrgs = Array.from(
                    new Set((formData.organization || '').split(',').map((s: string) => s.trim()).filter(Boolean))
                  );
                  const isChecked = currentOrgs.includes(dept);

                  const toggleDept = (e: React.MouseEvent) => {
                    e.preventDefault();
                    let updated: string[];
                    if (isChecked) {
                      updated = currentOrgs.filter((s: string) => s !== dept);
                    } else {
                      updated = Array.from(new Set([...currentOrgs, dept]));
                    }
                    handleInputChange('organization', updated.join(', '));
                  };

                  return (
                    <label
                      key={dept}
                      onClick={toggleDept}
                      className={`flex items-center gap-2.5 px-4 py-2 border cursor-pointer font-semibold text-sm transition-all select-none ${
                        isChecked
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 accent-slate-900 cursor-pointer"
                      />
                      <span>{dept}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {(formLang === 'both' || formLang === 'ar') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>اللجنة / القسم (بالعربية)</span>
                  <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">AR</span>
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: لجنة المشاريع، لجنة التنظيم"
                  value={formData.organization_ar || ''}
                  onChange={(e) => handleInputChange('organization_ar', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-800 focus:bg-white focus:outline-none font-arabic"
                />
              </div>
            )}
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
      <div className="space-y-4">
        {/* Header Controls */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Filter by Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                fetchEventRegistrations(e.target.value);
              }}
              className="w-full sm:w-72 bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Events ({eventsList.length})</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-emerald-700 font-mono">{approvedCount} Approved</span>
              <span className="text-amber-700 font-mono">{pendingCount} Pending</span>
              <span className="text-rose-700 font-mono">{rejectedCount} Rejected</span>
            </div>
            {totalCount > 0 && (
              <button
                onClick={exportEventRegistrationsCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
          </div>
        </div>

        {/* List of Event Registrations */}
        {eventRegsLoading ? (
          <div className="flex justify-center py-12 bg-white border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
          </div>
        ) : eventRegistrations.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No event registrations found for this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {eventRegistrations.map((item) => {
              const isExpanded = expandedRows.has(item.id);
              const members: any[] = item.event_registration_members || [];
              const leader = members.find((m: any) => m.is_leader) || members[0] || {};
              const isTeam = item.registration_type === 'team';
              const studentIdMatch = item.institution?.match(/\[ID:\s*(\d+)\]/) || item.companion_role?.match(/Student ID:\s*(\d+)/) || item.team_name?.match(/Student ID:\s*(\d+)/);
              const studentId = studentIdMatch ? studentIdMatch[1] : null;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 transition-colors"
                >
                  {/* Collapsed Header */}
                  <div 
                    onClick={() => toggleRowExpand(item.id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {isTeam ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {isTeam ? (item.team_name || 'Team Registration') : leader.full_name}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-mono uppercase border ${
                            item.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            item.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                            'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {item.status || 'pending'}
                          </span>
                          {studentId && (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-300">
                              Student ID: {studentId}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-0.5">
                          Event: <strong className="text-slate-800">{item.events?.title || `#${item.event_id}`}</strong> • {item.institution} ({item.study_year})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        {item.has_companion && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold flex items-center gap-1">
                            <Car className="w-3 h-3" /> Companion
                          </span>
                        )}
                        {isTeam && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold font-mono">
                            {members.length} Members
                          </span>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/50 p-4 space-y-4">
                      {/* Companion Banner if present */}
                      {item.has_companion && (
                        <div className="p-3 bg-white border border-slate-200 flex items-center gap-2.5 text-xs">
                          <Car className="w-4 h-4 text-slate-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">Accompanying Companion</span>
                            <span className="text-slate-900 font-medium">{item.companion_name}</span>
                            <span className="text-slate-500 ml-1.5">({item.companion_role})</span>
                          </div>
                        </div>
                      )}

                      {/* Members Grid */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Registered Member(s) ({members.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {members.map((m: any, idx: number) => (
                            <div key={m.id || idx} className={`p-3 bg-white border ${m.is_leader ? 'border-slate-800 shadow-xs' : 'border-slate-200'}`}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-slate-900 text-xs">{m.full_name}</span>
                                {m.is_leader && (
                                  <span className="px-1.5 py-0.2 bg-slate-900 text-white text-[9px] font-bold uppercase">Leader</span>
                                )}
                              </div>
                              <div className="space-y-0.5 text-xs text-slate-600">
                                <p><strong className="text-slate-500 font-normal">Email:</strong> <a href={`mailto:${m.email}`} className="text-slate-800 hover:underline">{m.email}</a></p>
                                <p><strong className="text-slate-500 font-normal">Phone:</strong> <a href={`tel:${m.phone}`} className="text-slate-800 font-mono hover:underline">{m.phone}</a></p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.status !== 'approved' && (
                            <button
                              onClick={() => handleEventRegStatusChange(item.id, 'approved')}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          {item.status !== 'rejected' && (
                            <button
                              onClick={() => handleEventRegStatusChange(item.id, 'rejected')}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          )}
                          {item.status && item.status !== 'pending' && (
                            <button
                              onClick={() => handleEventRegStatusChange(item.id, 'pending')}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Reset to Pending
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteEventReg(item.id)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 hover:border-rose-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>

                      {/* Event Email Action (Combined Invitation & Selection Pass) */}
                      <div className="w-full pt-2.5 border-t border-slate-200">
                        <button
                          onClick={() => {
                            const targetName = isTeam ? (item.team_name || 'Team') : leader.full_name;
                            setTargetRecipientName(targetName);
                            setTargetEmail(leader.email || '');
                            setEventTitle(item.events?.title || 'E.R.I.S.E. Event');
                            setEmailType('event_invitation');
                            setEmailSuccessMsg(null);
                            setEmailErrorMsg(null);
                            setEmailModalOpen(true);
                          }}
                          className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Send Event Invitation & Selection Pass</span>
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
      <div className="space-y-4">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-slate-900 font-bold text-base flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-slate-700" /> Club Membership Intake Status
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {registrationOpen ? 'Club intake form is currently OPEN for new student applications.' : 'Club intake form is currently CLOSED.'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {totalCount > 0 && (
              <button
                onClick={exportClubRegistrationsCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
            <button
              onClick={toggleRegistration}
              disabled={togglingRegistration}
              className={`flex items-center gap-2 px-4 py-1.5 font-bold text-xs transition-all shrink-0 border cursor-pointer ${
                registrationOpen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {togglingRegistration ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : registrationOpen ? (
                <ToggleRight className="w-4 h-4 text-emerald-700" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-rose-700" />
              )}
              {registrationOpen ? 'Intake Open' : 'Intake Closed'}
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200 p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member by name, email, phone, year, department..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none"
            />
            {memberSearchQuery && (
              <button
                onClick={() => setMemberSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: `All (${totalCount})` },
              { id: 'pending', label: `Pending (${pendingCount})`, color: 'text-amber-700' },
              { id: 'approved', label: `Approved (${approvedCount})`, color: 'text-emerald-700' },
              { id: 'rejected', label: `Rejected (${rejectedCount})`, color: 'text-rose-700' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMemberStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer border ${
                  memberStatusFilter === tab.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 hover:text-slate-900 border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member List */}
        {dataLoading ? (
          <div className="flex justify-center py-12 bg-white border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center text-slate-500 text-xs">
            {memberSearchQuery || memberStatusFilter !== 'all'
              ? 'No member registrations match your search or filter.'
              : 'No club registrations found.'}
          </div>
        ) : (
          <div className="space-y-2.5">
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
                  className="bg-white border border-slate-200 hover:border-slate-400 p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center justify-center text-xs uppercase shrink-0">
                      {item.full_name ? item.full_name.charAt(0) : 'M'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.full_name}
                        </span>
                        <span
                          className={`px-2 py-0.2 text-[10px] font-mono uppercase border ${
                            status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : status === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Yr {item.study_year}</span>
                        {item.specialization && <span>• {item.specialization}</span>}
                        <span>• {item.email}</span>
                        <span className="font-mono">• {item.phone}</span>
                      </p>

                      {depts.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {depts.map((d) => (
                            <span key={d} className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700">
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
                    className="flex items-center justify-between md:justify-end gap-2 shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100"
                  >
                    <span className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hidden sm:inline mr-2">
                      Details →
                    </span>

                    {status !== 'approved' && (
                      <button
                        onClick={() => handleMemberStatusChange(item.id, 'approved')}
                        disabled={statusUpdatingId === item.id}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Accept / Approve Member"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> <span>Accept</span>
                      </button>
                    )}

                    {status !== 'rejected' && (
                      <button
                        onClick={() => handleMemberStatusChange(item.id, 'rejected')}
                        disabled={statusUpdatingId === item.id}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Reject Member"
                      >
                        <XCircle className="w-3.5 h-3.5" /> <span>Reject</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteMember(item.id, item.full_name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
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
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f8fcfd] flex items-center justify-center p-4 [color-scheme:light] font-sans text-slate-900">
        <div className="bg-white p-6 sm:p-8 border border-slate-300 w-full max-w-md space-y-5 shadow-sm">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-slate-100 text-slate-800 border border-slate-300 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              E.R.I.S.E. Administrative Portals
            </h1>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <span className="font-mono text-slate-600">Connected</span>
              <span>•</span>
              <span>Secure Gateway</span>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 text-xs font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {lockoutSeconds > 0 && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 text-xs font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 animate-spin text-amber-700" />
              <span>Security lockout active: {lockoutSeconds}s remaining</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Dashboard Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  disabled={lockoutSeconds > 0 || loading}
                  className="w-full bg-slate-50 border border-slate-300 pl-3.5 pr-10 py-2.5 text-slate-900 text-xs focus:border-slate-800 focus:bg-white focus:outline-none transition-colors disabled:opacity-50"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Optional Username Accordion if specific user login is needed */}
            <div>
              <button
                type="button"
                onClick={() => setUsername(username ? '' : 'admin')}
                className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
              >
                {username ? 'Hide custom username' : 'Specify custom username (optional)'}
              </button>

              {username !== '' && (
                <div className="mt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or ayoub_berbache"
                    disabled={lockoutSeconds > 0 || loading}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-slate-900 text-xs focus:border-slate-800 focus:bg-white focus:outline-none disabled:opacity-50"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs tracking-wider uppercase cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Authenticate & Enter Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-500">
              Department credentials automatically route to the corresponding department dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── AUTHENTICATED DASHBOARD VIEW ──────────────────────────────────────────
  const isViewingProjects = userRole === 'head_projects' || (userRole === 'admin' && (portalSlug === 'projects' || activeTab === 'portal_projects'));
  const isViewingOrganization = userRole === 'head_organization' || (userRole === 'admin' && (portalSlug === 'organization' || activeTab === 'portal_organization'));
  const isViewingMedia = userRole === 'head_media' || (userRole === 'admin' && (portalSlug === 'media' || activeTab === 'portal_media'));

  const roleTitle = 
    userRole === 'admin' ? 'Super Admin' :
    userRole === 'head_projects' ? 'Projects Head' :
    userRole === 'head_organization' ? 'Organization Head' :
    userRole === 'head_media' ? 'Media Head' : 'Staff';

  const sidebarTabs = [
    { key: 'leaders', label: 'Leaders', icon: Users },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'event_registrations', label: 'Event Registrations', icon: UserCheck },
    { key: 'achievements', label: 'Achievements', icon: Award },
    { key: 'star_members', label: 'Star Members', icon: Star },
    { key: 'registrations', label: 'Club Intake', icon: ClipboardList },
  ] as const;

  const departmentLinks = [
    { slug: 'projects', label: 'Projects Portal', icon: Cpu },
    { slug: 'organization', label: 'Organization Portal', icon: Building },
    { slug: 'media', label: 'Media Portal', icon: Camera },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#f8fcfd] text-slate-900 flex flex-col [color-scheme:light] font-sans">
      {/* Top Static Header */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm sm:text-base truncate">
                {isViewingProjects ? 'Projects Administration' :
                 isViewingOrganization ? 'Organization & Logistics' :
                 isViewingMedia ? 'Media & Production' : 'E.R.I.S.E. Administrative Portal'}
              </span>
              <span className="text-slate-300 hidden xs:inline">•</span>
              <span className="text-xs font-mono text-slate-500 hidden xs:inline">
                Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {currentUser?.name || 'Administrator'} • <span className="font-mono text-slate-700">{roleTitle}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {userRole === 'admin' && (isViewingProjects || isViewingOrganization || isViewingMedia) && (
            <button
              onClick={() => {
                setActiveTab('leaders');
                navigate('/admin/super');
              }}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">← Return to </span>Core Admin
            </button>
          )}

          <button
            onClick={handleLogout}
            className="px-2.5 sm:px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Horizontal Mobile Navigation Bar for Super Admin */}
      {userRole === 'admin' && !isViewingProjects && !isViewingOrganization && !isViewingMedia && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-3 py-2 overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  if (portalSlug !== 'super') navigate('/admin/super');
                }}
                className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          {!MASK_PORTAL_BUTTONS && departmentLinks.map((dept) => {
            const Icon = dept.icon;
            return (
              <button
                key={dept.slug}
                onClick={() => {
                  setActiveTab(`portal_${dept.slug}` as any);
                  navigate(`/admin/${dept.slug}`);
                }}
                className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap bg-white text-slate-700 hover:text-slate-900 border border-slate-300 shrink-0 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{dept.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Body Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Sidebar (Only in Super Admin core view) */}
        {userRole === 'admin' && !isViewingProjects && !isViewingOrganization && !isViewingMedia && (
          <aside className="hidden lg:flex w-56 shrink-0 bg-white border-r border-slate-200 p-3 flex-col justify-between overflow-y-auto">
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Club Core Modules
              </div>
              {sidebarTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key as any);
                      if (portalSlug !== 'super') navigate('/admin/super');
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'text-slate-700 hover:bg-slate-100 border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              {!MASK_PORTAL_BUTTONS && (
                <>
                  <div className="px-2.5 pt-4 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-200 mt-3">
                    Department Portals
                  </div>
                  {departmentLinks.map((dept) => {
                    const Icon = dept.icon;
                    return (
                      <button
                        key={dept.slug}
                        onClick={() => {
                          setActiveTab(`portal_${dept.slug}` as any);
                          navigate(`/admin/${dept.slug}`);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold flex items-center gap-2.5 text-slate-700 hover:bg-slate-100 border border-transparent transition-colors cursor-pointer"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{dept.label}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div className="font-semibold text-slate-700">Status: <span className="font-mono text-slate-900">Connected</span></div>
              <div>Direct DB Connection</div>
            </div>
          </aside>
        )}

        {/* Scrollable Content Viewport */}
        <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 bg-[#f8fcfd]">
          {isViewingProjects ? (
            <ProjectsPortal isSuperAdmin={userRole === 'admin'} onBackToAdmin={() => { setActiveTab('leaders'); navigate('/admin/super'); }} />
          ) : isViewingOrganization ? (
            <OrganizationPortal isSuperAdmin={userRole === 'admin'} onBackToAdmin={() => { setActiveTab('leaders'); navigate('/admin/super'); }} />
          ) : isViewingMedia ? (
            <MediaPortal isSuperAdmin={userRole === 'admin'} onBackToAdmin={() => { setActiveTab('leaders'); navigate('/admin/super'); }} />
          ) : activeTab === 'event_registrations' ? (
            <>
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Event Registrations</h2>
                <p className="text-xs text-slate-500">Manage participant and team registrations per event.</p>
              </div>
              {renderEventRegistrationsTab()}
            </>
          ) : activeTab === 'registrations' ? (
            <>
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Club Intake Registrations</h2>
                <p className="text-xs text-slate-500">Review student applicants and approve new club recruits.</p>
              </div>
              {renderRegistrationsTab()}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 capitalize">{activeTab.replace('_', ' ')} Management</h2>
                  <p className="text-xs text-slate-500">Manage club {activeTab.replace('_', ' ')} records.</p>
                </div>
                <button 
                  onClick={() => openModal('add')}
                  className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-1.5 hover:bg-slate-800 transition-colors font-bold text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New
                </button>
              </div>

              {dataLoading ? (
                <div className="flex justify-center py-12 bg-white border border-slate-200">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                </div>
              ) : data.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs">
                  No records found for this module. Click "Add New" to create one.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 overflow-hidden">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 font-bold w-14">ID</th>
                          <th className="px-4 py-2.5 font-bold w-20">Image</th>
                          <th className="px-4 py-2.5 font-bold">Name / Title</th>
                          <th className="px-4 py-2.5 font-bold w-28 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {data.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-900 font-mono font-bold">{item.id}</td>
                            <td className="px-4 py-3">
                              {item.image ? (
                                <div className="w-9 h-9 border border-slate-200 overflow-hidden">
                                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-9 h-9 bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">None</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-bold text-xs">{item.name || item.title}</span>
                                {(item.name_ar || item.title_ar) && (
                                  <span className="text-xs text-emerald-800 font-arabic font-medium dir-rtl text-right">
                                    {item.name_ar || item.title_ar}
                                  </span>
                                )}
                                {(item.role || item.role_ar) && (
                                  <span className="text-[11px] text-slate-500">
                                    {item.role} {item.role_ar ? `• ${item.role_ar}` : ''}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openModal('edit', item)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer" title="Edit">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden divide-y divide-slate-200">
                    {data.map((item) => (
                      <div key={item.id} className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.image ? (
                            <img src={item.image} alt="" className="w-11 h-11 object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-11 h-11 bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-[10px] text-slate-400">None</div>
                          )}
                          <div className="min-w-0">
                            <span className="block font-bold text-slate-900 text-xs truncate">{item.name || item.title}</span>
                            {(item.name_ar || item.title_ar) && (
                              <span className="block text-xs text-emerald-800 font-arabic truncate font-medium dir-rtl">
                                {item.name_ar || item.title_ar}
                              </span>
                            )}
                            {(item.role || item.role_ar) && (
                              <span className="block text-[11px] text-slate-500 truncate">
                                {item.role} {item.role_ar ? `• ${item.role_ar}` : ''}
                              </span>
                            )}
                            <span className="block text-[10px] text-slate-400 font-mono">ID #{item.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => openModal('edit', item)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer" title="Edit">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-300 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 capitalize">{modalMode} {activeTab.replace('_', ' ')}</h3>
              <button onClick={closeModal} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <form id="crud-form" onSubmit={handleSave}>
                {renderFormFields()}
              </form>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2.5 bg-slate-50">
              <button 
                type="button" 
                onClick={closeModal}
                className="px-4 py-2 border border-slate-300 font-bold text-xs text-slate-700 bg-white hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                form="crud-form"
                type="submit"
                disabled={saving || uploadingImage}
                className="px-5 py-2 font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-300 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-base uppercase shrink-0">
                  {selectedMember.full_name ? selectedMember.full_name.charAt(0) : 'M'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 truncate">{selectedMember.full_name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      selectedMember.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      selectedMember.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                      'bg-amber-50 text-amber-700 border-amber-300'
                    }`}>
                      {selectedMember.status || 'pending'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">Member ID: #{selectedMember.id}</p>
                </div>
              </div>
              <button 
                onClick={() => { setMemberModalOpen(false); setSelectedMember(null); }}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contact Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                      <a href={`mailto:${selectedMember.email}`} className="text-xs font-medium text-slate-900 hover:underline truncate">
                        {selectedMember.email}
                      </a>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedMember.email, 'email')}
                      className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-medium text-slate-700 transition-colors shrink-0"
                      title="Copy Email"
                    >
                      {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                      <a href={`tel:${selectedMember.phone}`} className="text-xs font-medium text-slate-900 hover:underline truncate">
                        {selectedMember.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://wa.me/${selectedMember.phone?.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        title="WhatsApp"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(selectedMember.phone, 'phone')}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-medium text-slate-700 transition-colors"
                        title="Copy Phone"
                      >
                        {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'phone' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Background */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Academic Background</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="block text-[11px] text-slate-500 mb-0.5">Study Year</span>
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-slate-600" /> Year {selectedMember.study_year}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="block text-[11px] text-slate-500 mb-0.5">Specialization</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {selectedMember.specialization || 'N/A (1st/2nd Year)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Departments */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selected Department(s)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(selectedMember.departments) && selectedMember.departments.length > 0 ? (
                    selectedMember.departments.map((d: string) => (
                      <span key={d} className="px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs">
                        {d}
                      </span>
                    ))
                  ) : typeof selectedMember.departments === 'string' && selectedMember.departments ? (
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs">
                      {selectedMember.departments}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No department selected</span>
                  )}
                </div>
              </div>

              {/* Registration Date */}
              {selectedMember.registered_at && (
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-200 flex items-center gap-2 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Registered: {formatDate(selectedMember.registered_at)}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  onClick={() => copyAllMemberInfo(selectedMember)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'all' ? 'Info Copied!' : 'Copy All Info'}</span>
                </button>

                <button
                  onClick={() => handleDeleteMember(selectedMember.id, selectedMember.full_name)}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Member
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={() => handleMemberStatusChange(selectedMember.id, 'approved')}
                  disabled={statusUpdatingId === selectedMember.id || selectedMember.status === 'approved'}
                  className={`py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    selectedMember.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 opacity-70 cursor-default'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
                  }`}
                >
                  {statusUpdatingId === selectedMember.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  {selectedMember.status === 'approved' ? 'Approved' : 'Accept / Approve'}
                </button>

                <button
                  onClick={() => handleMemberStatusChange(selectedMember.id, 'rejected')}
                  disabled={statusUpdatingId === selectedMember.id || selectedMember.status === 'rejected'}
                  className={`py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    selectedMember.status === 'rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 opacity-70 cursor-default'
                      : 'bg-rose-600 text-white hover:bg-rose-700 border-rose-600'
                  }`}
                >
                  {statusUpdatingId === selectedMember.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  {selectedMember.status === 'rejected' ? 'Rejected' : 'Reject'}
                </button>
              </div>

              {/* Recruitment Email Automation Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    setEmailType('meeting');
                    setTargetRecipientName(selectedMember.full_name || '');
                    setTargetEmail(selectedMember.email || '');
                    setEmailSuccessMsg(null);
                    setEmailErrorMsg(null);
                    setEmailModalOpen(true);
                  }}
                  className="py-2 px-2.5 bg-white text-slate-800 hover:bg-slate-100 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                  <span>Send Meeting Email</span>
                </button>

                <button
                  onClick={() => {
                    setEmailType('acceptance');
                    setTargetRecipientName(selectedMember.full_name || '');
                    setTargetEmail(selectedMember.email || '');
                    setAcceptanceDepts(
                      Array.isArray(selectedMember.departments)
                        ? selectedMember.departments.join(', ')
                        : selectedMember.departments || 'Organization'
                    );
                    setEmailSuccessMsg(null);
                    setEmailErrorMsg(null);
                    setEmailModalOpen(true);
                  }}
                  className="py-2 px-2.5 bg-white text-slate-800 hover:bg-slate-100 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-600" />
                  <span>Send Acceptance Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Dialog Modal */}
      {emailModalOpen && (selectedMember || targetEmail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-300 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                {emailType === 'meeting' ? (
                  <Calendar className="w-5 h-5 text-slate-700" />
                ) : emailType === 'event_invitation' ? (
                  <Mail className="w-5 h-5 text-slate-700" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {emailType === 'meeting' ? 'Schedule Interview Email' :
                   emailType === 'acceptance' ? 'Send Recruitment Acceptance' :
                   emailType === 'event_invitation' ? 'Send Event Invitation' :
                   'Send Event Selection Pass'}
                </h3>
              </div>
              <button 
                onClick={() => setEmailModalOpen(false)} 
                className="text-slate-500 hover:text-slate-900 p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>Recipient: <strong className="text-slate-900">{targetRecipientName || selectedMember?.full_name}</strong> ({targetEmail || selectedMember?.email})</p>
            </div>

            {emailSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{emailSuccessMsg}</span>
              </div>
            )}

            {emailErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{emailErrorMsg}</span>
              </div>
            )}

            {!emailSuccessMsg && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Recipient Name (Greeting Name)
                  </label>
                  <input
                    type="text"
                    value={targetRecipientName}
                    onChange={(e) => setTargetRecipientName(e.target.value)}
                    placeholder="Candidate Name or Team Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-slate-800 focus:bg-white text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-slate-800 focus:bg-white text-xs font-medium text-slate-900"
                  />
                </div>

                {(emailType === 'event_invitation' || emailType === 'event_acceptance') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Event Title"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-slate-800 focus:bg-white text-xs font-bold text-slate-900"
                    />
                  </div>
                )}

                {emailType !== 'acceptance' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Date & Time
                      </label>
                      <input
                        type="text"
                        value={meetingDateTime}
                        onChange={(e) => setMeetingDateTime(e.target.value)}
                        placeholder="e.g. Tuesday, Aug 5 at 14:00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-slate-800 focus:bg-white text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Location / Venue
                      </label>
                      <input
                        type="text"
                        value={meetingLocation}
                        onChange={(e) => setMeetingLocation(e.target.value)}
                        placeholder="e.g. Batna Campus"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-slate-800 focus:bg-white text-xs text-slate-900"
                      />
                    </div>
                  </>
                )}

                {(emailType === 'event_invitation' || emailType === 'event_acceptance') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Important Note / Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={eventNotes}
                      onChange={(e) => setEventNotes(e.target.value)}
                      placeholder="e.g. Please bring your laptop and student ID card."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-slate-800 focus:bg-white text-xs text-slate-900"
                    />
                  </div>
                )}

                {emailType === 'acceptance' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Department(s)
                    </label>
                    <input
                      type="text"
                      value={acceptanceDepts}
                      onChange={(e) => setAcceptanceDepts(e.target.value)}
                      placeholder="e.g. Organization, Media, Projects"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-slate-800 focus:bg-white text-xs text-slate-900"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Projects', 'Organization', 'Media'].map((dept) => {
                        const isIncluded = acceptanceDepts.toLowerCase().includes(dept.toLowerCase());
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              const deptsArr = acceptanceDepts ? acceptanceDepts.split(',').map(s => s.trim()).filter(Boolean) : [];
                              if (isIncluded) {
                                setAcceptanceDepts(deptsArr.filter(d => !d.toLowerCase().includes(dept.toLowerCase())).join(', '));
                              } else {
                                setAcceptanceDepts([...deptsArr, dept].join(', '));
                              }
                            }}
                            className={`px-2.5 py-1 text-xs font-bold transition-all border ${
                              isIncluded
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            + {dept}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      Organization members will automatically receive a required onboarding note & link to the E.R.I.S.E. portal.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {emailSuccessMsg ? 'Close' : 'Cancel'}
              </button>

              {!emailSuccessMsg && (
                <button
                  type="button"
                  onClick={handleSendEmailSubmit}
                  disabled={emailSendingLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {emailSendingLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Email</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
