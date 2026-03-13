'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { RelationshipIntent, WorkExperience } from '@/types';

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  memory_profile: {
    id: string;
    display_name: string;
    headline: string;
    location: string;
    work_experience: WorkExperience[];
    skills: string[];
    can_offer: string[];
    looking_for: string[];
    current_goals: string[];
    interests: string[];
    values: string[];
    intents: RelationshipIntent[];
  } | null;
  agent_profiles: Array<{
    id: string;
    intent: RelationshipIntent;
    summary: string;
    talking_points: string[];
    status: string;
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit form state
  const [formData, setFormData] = useState<{
    display_name: string;
    headline: string;
    location: string;
    skills: string[];
    can_offer: string[];
    looking_for: string[];
    current_goals: string[];
    interests: string[];
    values: string[];
    intents: RelationshipIntent[];
  }>({
    display_name: '',
    headline: '',
    location: '',
    skills: [],
    can_offer: [],
    looking_for: [],
    current_goals: [],
    interests: [],
    values: [],
    intents: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch user with memory profile and agent profiles
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          memory_profile:memory_profiles(*),
          agent_profiles(id, intent, summary, talking_points, status)
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        setError('加载个人资料失败');
        setLoading(false);
        return;
      }

      // Handle memory_profile being an array (from the join)
      const memoryProfile = Array.isArray(data.memory_profile)
        ? data.memory_profile[0] || null
        : data.memory_profile;

      const profileData: ProfileData = {
        ...data,
        memory_profile: memoryProfile,
      };

      setProfile(profileData);

      if (profileData.memory_profile) {
        setFormData({
          display_name: profileData.memory_profile.display_name || '',
          headline: profileData.memory_profile.headline || '',
          location: profileData.memory_profile.location || '',
          skills: profileData.memory_profile.skills || [],
          can_offer: profileData.memory_profile.can_offer || [],
          looking_for: profileData.memory_profile.looking_for || [],
          current_goals: profileData.memory_profile.current_goals || [],
          interests: profileData.memory_profile.interests || [],
          values: profileData.memory_profile.values || [],
          intents: profileData.memory_profile.intents || [],
        });
      }

      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '保存失败');
      }

      setSuccessMessage('个人资料已更新！AI Agent 正在重新生成中...');
      setEditMode(false);

      // Refresh profile data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleArrayInput = (
    field: keyof typeof formData,
    value: string
  ) => {
    const items = value.split(',').map((s) => s.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, [field]: items }));
  };

  const toggleIntent = (intent: RelationshipIntent) => {
    setFormData((prev) => ({
      ...prev,
      intents: prev.intents.includes(intent)
        ? prev.intents.filter((i) => i !== intent)
        : [...prev.intents, intent],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getIntentLabel = (intent: RelationshipIntent) => {
    switch (intent) {
      case 'professional': return '💼 职业';
      case 'dating': return '💕 交友';
      case 'friendship': return '🤝 友谊';
      default: return intent;
    }
  };

  const getAgentStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">已激活</span>;
      case 'generating':
        return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">生成中</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">生成失败</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-slate-900">
            A2A
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/matches" className="text-slate-600 hover:text-slate-900 transition">
              Matches
            </Link>
            <Link href="/meetings" className="text-slate-600 hover:text-slate-900 transition">
              Meetings
            </Link>
            <Link href="/profile" className="text-blue-600 font-medium">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-green-700">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name || ''}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-medium text-slate-500">
                    {profile?.name?.[0] || profile?.email?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {profile?.memory_profile?.display_name || profile?.name || '未设置'}
                </h1>
                <p className="text-slate-600">{profile?.memory_profile?.headline || '无标题'}</p>
                <p className="text-sm text-slate-400">{profile?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  编辑资料
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Mode */}
        {editMode && profile?.memory_profile && (
          <div className="space-y-6 mb-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">基本信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">显示名称</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">头衔/职位</label>
                  <input
                    type="text"
                    value={formData.headline}
                    onChange={(e) => setFormData((prev) => ({ ...prev, headline: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">所在地</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Intents */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">关系类型</h3>
              <div className="flex gap-3">
                {(['professional', 'dating', 'friendship'] as RelationshipIntent[]).map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => toggleIntent(intent)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition ${
                      formData.intents.includes(intent)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {getIntentLabel(intent)}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">技能专长</h3>
              <input
                type="text"
                value={formData.skills.join(', ')}
                onChange={(e) => handleArrayInput('skills', e.target.value)}
                placeholder="用逗号分隔，如：产品设计, 用户研究, 数据分析"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Can Offer */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">我能提供</h3>
              <input
                type="text"
                value={formData.can_offer.join(', ')}
                onChange={(e) => handleArrayInput('can_offer', e.target.value)}
                placeholder="用逗号分隔，如：技术指导, 行业洞察, 投资建议"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Looking For */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">我在寻找</h3>
              <input
                type="text"
                value={formData.looking_for.join(', ')}
                onChange={(e) => handleArrayInput('looking_for', e.target.value)}
                placeholder="用逗号分隔，如：合伙人, 投资人, 技术顾问"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Current Goals */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">当前目标</h3>
              <input
                type="text"
                value={formData.current_goals.join(', ')}
                onChange={(e) => handleArrayInput('current_goals', e.target.value)}
                placeholder="用逗号分隔，如：完成 A 轮融资, 扩展海外市场"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Interests */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">兴趣爱好</h3>
              <input
                type="text"
                value={formData.interests.join(', ')}
                onChange={(e) => handleArrayInput('interests', e.target.value)}
                placeholder="用逗号分隔，如：登山, 摄影, 阅读"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Values */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">价值观</h3>
              <input
                type="text"
                value={formData.values.join(', ')}
                onChange={(e) => handleArrayInput('values', e.target.value)}
                placeholder="用逗号分隔，如：真诚, 创新, 协作"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* View Mode - Memory Profile */}
        {!editMode && profile?.memory_profile && (
          <div className="space-y-6 mb-6">
            {/* Location & Intents */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex flex-wrap gap-4">
                {profile.memory_profile.location && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {profile.memory_profile.location}
                  </div>
                )}
                <div className="flex gap-2">
                  {profile.memory_profile.intents.map((intent) => (
                    <span
                      key={intent}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                    >
                      {getIntentLabel(intent)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Skills */}
            {profile.memory_profile.skills.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-3">技能专长</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.memory_profile.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Can Offer & Looking For */}
            <div className="grid grid-cols-2 gap-4">
              {profile.memory_profile.can_offer.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3">我能提供</h3>
                  <ul className="space-y-2">
                    {profile.memory_profile.can_offer.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-600">
                        <span className="text-green-500 mt-1">+</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {profile.memory_profile.looking_for.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3">我在寻找</h3>
                  <ul className="space-y-2">
                    {profile.memory_profile.looking_for.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-600">
                        <span className="text-blue-500 mt-1">*</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Current Goals */}
            {profile.memory_profile.current_goals.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-3">当前目标</h3>
                <ul className="space-y-2">
                  {profile.memory_profile.current_goals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600">
                      <span className="text-amber-500 mt-1">*</span>
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interests & Values */}
            <div className="grid grid-cols-2 gap-4">
              {profile.memory_profile.interests.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3">兴趣爱好</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.memory_profile.interests.map((interest, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.memory_profile.values.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3">价值观</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.memory_profile.values.map((value, i) => (
                      <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Profile */}
        {!profile?.memory_profile && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">尚未创建个人资料</h3>
            <p className="text-slate-600 mb-4">完成入职流程以创建您的 Memory Profile</p>
            <Link
              href="/onboarding"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              开始创建
            </Link>
          </div>
        )}

        {/* AI Agent Profiles */}
        {profile?.agent_profiles && profile.agent_profiles.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">你的 AI Agent</h2>
            <div className="space-y-4">
              {profile.agent_profiles.map((agent) => (
                <div key={agent.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">{getIntentLabel(agent.intent)}</span>
                    {getAgentStatusBadge(agent.status)}
                  </div>
                  <p className="text-slate-600 text-sm mb-3">{agent.summary}</p>
                  {agent.talking_points && agent.talking_points.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {agent.talking_points.slice(0, 3).map((point, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          {point.length > 30 ? point.slice(0, 30) + '...' : point}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">账户</h3>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
          >
            退出登录
          </button>
        </div>
      </main>
    </div>
  );
}
