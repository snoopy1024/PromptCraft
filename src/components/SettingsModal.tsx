import { useState, useEffect, useCallback } from 'react';
import { X, KeyRound, Eye, EyeOff, Check, ShieldCheck, Loader2 } from 'lucide-react';

function DeepSeekIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#4D6BFE" />
      <g transform="translate(2.4, 2.4) scale(0.8)">
        <path
          fill="white"
          d="M23.748 4.651c-.254-.124-.364.113-.512.233c-.051.04-.094.09-.137.137c-.372.397-.806.657-1.373.626c-.829-.046-1.537.214-2.163.848c-.133-.782-.575-1.248-1.247-1.548c-.352-.155-.708-.311-.955-.65c-.172-.24-.219-.509-.305-.774c-.055-.16-.11-.323-.293-.35c-.2-.031-.278.136-.356.276c-.313.572-.434 1.202-.422 1.84c.027 1.436.633 2.58 1.838 3.393c.137.094.172.187.129.323c-.082.28-.18.553-.266.833c-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836c.27-.098.094-.433-.778-.428c-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136a9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653c1.857 1.533 3.997 2.284 6.438 2.14c1.482-.085 3.132-.284 4.994-1.86c.47.234.962.328 1.78.398c.629.058 1.235-.031 1.705-.129c.735-.155.684-.836.418-.961c-2.155-1.004-1.682-.595-2.112-.926c1.095-1.295 2.768-3.598 3.284-6.733c.05-.346.115-.834.108-1.114c-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517c.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16c-.39.024-.32.472-.234.763c.09.288.207.487.371.74c.114.167.192.416-.113.603c-.673.416-1.842-.14-1.897-.168c-1.361-.801-2.5-1.86-3.301-3.306c-.775-1.393-1.225-2.888-1.299-4.482c-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774c.868.86 1.525 1.887 2.202 2.89c.72 1.066 1.494 2.082 2.48 2.915c.348.291.626.513.892.677c-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287a.3.3 0 0 1 .113.074a.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727c-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078a.253.253 0 0 1-.114-.358a1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016c.352.144.618.408 1.001.782c.392.451.462.576.685.915c.176.264.336.536.446.848c.066.194-.02.353-.25.45"
        />
      </g>
    </svg>
  );
}

type KeyStatus = 'empty' | 'checking' | 'ok' | 'error';

function StatusDot({ status, onRecheck }: { status: KeyStatus; onRecheck: () => void }) {
  const colors: Record<string, string> = {
    empty: 'bg-gray-300',
    ok: 'bg-emerald-400',
    error: 'bg-red-400',
    checking: '',
  };

  const labels: Record<string, string> = {
    empty: '未配置',
    ok: '已连通',
    error: '无法连通',
    checking: '检测中',
  };

  return (
    <button
      onClick={onRecheck}
      disabled={status === 'checking'}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-gray-500 transition-colors hover:bg-gray-100 disabled:pointer-events-none"
      title="点击重新检测"
    >
      {status === 'checking' ? (
        <Loader2 size={12} className="animate-spin text-gray-400" />
      ) : (
        <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />
      )}
      {labels[status]}
    </button>
  );
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = 'keys';

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('keys');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('empty');

  const verifyKey = useCallback(async () => {
    setKeyStatus('checking');
    try {
      const res = await fetch('/api/settings/api-keys/deepseek/verify', { method: 'POST' });
      const data = await res.json();
      setKeyStatus(data.status === 'ok' ? 'ok' : data.status === 'empty' ? 'empty' : 'error');
    } catch {
      setKeyStatus('error');
    }
  }, []);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/api-keys');
      const data = await res.json();
      if (data.deepseek) {
        setDeepseekKey(data.deepseek);
        setHasExistingKey(true);
        setIsEditing(false);
      } else {
        setDeepseekKey('');
        setHasExistingKey(false);
        setIsEditing(true);
        setKeyStatus('empty');
      }
    } catch {
      setDeepseekKey('');
      setHasExistingKey(false);
      setIsEditing(true);
      setKeyStatus('empty');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchKeys().then(() => {
        verifyKey();
      });
      setShowKey(false);
      setSaveStatus('idle');
    }
  }, [open, fetchKeys, verifyKey]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = deepseekKey.trim();
    setSaveStatus('saving');
    try {
      await fetch('/api/settings/api-keys/deepseek', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trimmed }),
      });

      if (trimmed) {
        setDeepseekKey(trimmed);
        setHasExistingKey(true);
      } else {
        setDeepseekKey('');
        setHasExistingKey(false);
      }
      setIsEditing(false);
      setSaveStatus('saved');
      await verifyKey();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setShowKey(false);
  };

  const handleCancelEdit = () => {
    if (hasExistingKey) {
      fetchKeys().then(() => verifyKey());
      setIsEditing(false);
      setShowKey(false);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '\u2022'.repeat(key.length);
    return key.slice(0, 5) + '\u2022'.repeat(Math.min(key.length - 9, 20)) + key.slice(-4);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 flex h-[620px] w-full max-w-[800px] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left sidebar */}
        <div className="flex w-[220px] flex-shrink-0 flex-col border-r border-gray-100 bg-[#fafaf8]">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h2 className="text-[17px] font-semibold text-gray-900">设置</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex flex-col gap-0.5 px-3">
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                activeTab === 'keys'
                  ? 'bg-[#eae8e3] text-gray-900'
                  : 'text-gray-500 hover:bg-[#efede8] hover:text-gray-700'
              }`}
            >
              <KeyRound size={16} />
              密钥
            </button>
          </nav>
        </div>

        {/* Right content */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-7 pt-6 pb-24">
            <h3 className="text-[15px] font-semibold text-gray-900">API 密钥配置</h3>
            <p className="mt-1 text-[13px] text-gray-400">配置 AI 模型的 API 密钥</p>

            {loading ? (
              <div className="mt-16 flex items-center justify-center text-gray-300">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : (
              <>
                {/* DeepSeek Card */}
                <div className="mt-5 rounded-xl border border-gray-200/80">
                  {/* Card header */}
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <DeepSeekIcon size={32} />
                      <div>
                        <h4 className="text-[14px] font-semibold text-gray-900">DeepSeek</h4>
                        <p className="text-[12px] text-gray-400">api.deepseek.com</p>
                      </div>
                    </div>
                    <StatusDot status={keyStatus} onRecheck={verifyKey} />
                  </div>

                  {/* Card body */}
                  <div className="px-5 py-4">
                    {isEditing ? (
                      <>
                        <label className="mb-2 block text-[13px] font-medium text-gray-600">
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showKey ? 'text' : 'password'}
                            value={deepseekKey}
                            onChange={(e) => setDeepseekKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full rounded-lg border border-gray-200/80 bg-white px-3.5 py-2.5 pr-10 font-mono text-[13px] text-gray-900 outline-none placeholder:text-gray-300 focus:border-[#4D6BFE]/40 focus:ring-2 focus:ring-[#4D6BFE]/10"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave();
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-300 transition-colors hover:text-gray-500"
                            tabIndex={-1}
                          >
                            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        <div className="mt-3.5 flex items-center gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className="rounded-lg bg-[#4D6BFE] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#3d5bef] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            {saveStatus === 'saving' ? (
                              <span className="flex items-center gap-1.5">
                                <Loader2 size={13} className="animate-spin" />
                                保存中
                              </span>
                            ) : saveStatus === 'saved' ? (
                              <span className="flex items-center gap-1">
                                <Check size={14} />
                                已保存
                              </span>
                            ) : (
                              '保存'
                            )}
                          </button>
                          {hasExistingKey && (
                            <button
                              onClick={handleCancelEdit}
                              className="rounded-lg px-4 py-2 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-100"
                            >
                              取消
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[12px] text-gray-400">当前密钥</p>
                          <p className="mt-1 font-mono text-[13px] tracking-wide text-gray-600">
                            {maskKey(deepseekKey)}
                          </p>
                        </div>
                        <div className="mt-3.5">
                          <button
                            onClick={handleStartEdit}
                            className="rounded-lg border border-gray-200/80 px-3.5 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                          >
                            修改
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Floating hint bar pinned to bottom */}
          <div className="absolute right-0 bottom-0 left-0 border-t border-gray-100 bg-[#fafaf8] px-7 py-3.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={15} className="mt-0.5 flex-shrink-0 text-[#4D6BFE]/50" />
              <p className="text-[12px] leading-relaxed text-gray-400">
                API 密钥保存在本地 .env 文件中，通过本地服务转发至官方 API，全程不经过第三方。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
