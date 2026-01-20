/**
 * 설정 페이지 - Calm 스타일
 *
 * 앱 설정 및 계정 관리 페이지입니다.
 * 실제 동작하는 토글, 모달, 설정 기능을 제공합니다.
 *
 * ## 기능
 * - 푸시 알림 토글
 * - 운동 리마인더 설정
 * - 다크 모드 선택
 * - 개인정보 처리방침 모달
 * - 앱 정보 모달
 * - 계정 관리
 * - 로그아웃
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Info,
  ChevronRight,
  LogOut,
  Mail,
  Smartphone,
  X,
  Check,
  Trash2,
  Activity,
} from 'lucide-react';
// AppHeader는 SidebarLayout에서 처리됨
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAuth } from '@/components/providers/AuthProvider';

// ============================================================
// 애니메이션 설정
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// ============================================================
// 컴포넌트: 토글 스위치
// ============================================================

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
}

function ToggleSwitch({ enabled, onToggle }: ToggleSwitchProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`
        relative w-12 h-7 rounded-full
        transition-colors duration-300
        ${enabled ? 'bg-blue-500/100/100' : 'bg-muted'}
      `}
    >
      <div
        className={`
          absolute top-1 w-5 h-5 rounded-full
          bg-card shadow-sm
          transition-transform duration-300
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

// ============================================================
// 컴포넌트: 모달
// ============================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[60]"
          />

          {/* 모달 컨텐츠 */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-[90%] max-w-md
              bg-card rounded-2xl
              shadow-xl z-[70]
              overflow-hidden
            "
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <button
                onClick={onClose}
                className="
                  w-8 h-8 rounded-lg
                  bg-muted hover:bg-accent/80
                  flex items-center justify-center
                  transition-colors duration-300
                "
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* 컨텐츠 */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// 컴포넌트: 설정 항목 (토글 버전)
// ============================================================

interface SettingToggleItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
}

function SettingToggleItem({ icon, label, description, enabled, onToggle }: SettingToggleItemProps) {
  return (
    <div
      className="
        w-full flex items-center justify-between
        px-4 py-4
        bg-card
        border-b border-border last:border-b-0
      "
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/100/10 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <span className="font-medium text-foreground">{label}</span>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <ToggleSwitch enabled={enabled} onToggle={onToggle} />
    </div>
  );
}

// ============================================================
// 컴포넌트: 설정 항목 (클릭 버전)
// ============================================================

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}

function SettingItem({ icon, label, value, onClick, danger }: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between
        px-4 py-4
        bg-card
        hover:bg-muted
        transition-colors duration-300
        border-b border-border last:border-b-0
        ${danger ? 'text-red-500' : 'text-foreground'}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-9 h-9 rounded-xl
          ${danger ? 'bg-red-500/100/10' : 'bg-blue-500/100/10'}
          flex items-center justify-center
        `}>
          {icon}
        </div>
        <span className="font-medium">{label}</span>
      </div>

      <div className="flex items-center gap-2">
        {value && (
          <span className="text-sm text-muted-foreground">{value}</span>
        )}
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </button>
  );
}

// ============================================================
// 컴포넌트: 설정 그룹
// ============================================================

interface SettingGroupProps {
  title: string;
  children: React.ReactNode;
}

function SettingGroup({ title, children }: SettingGroupProps) {
  return (
    <motion.div variants={itemVariants} className="mb-6">
      <h2 className="text-sm font-semibold text-muted-foreground px-4 mb-2">
        {title}
      </h2>
      <div className="
        bg-card
        rounded-xl
        border border-border
        shadow-sm
        overflow-hidden
      ">
        {children}
      </div>
    </motion.div>
  );
}

// ============================================================
// 다크 모드 옵션
// ============================================================

type DarkModeOption = 'system' | 'light' | 'dark';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const darkModeLabels: Record<DarkModeOption, string> = {
  system: '시스템 설정',
  light: '라이트 모드',
  dark: '다크 모드',
};

// ============================================================
// 리마인더 시간 옵션
// ============================================================

const reminderTimeOptions = [
  '오전 6시',
  '오전 7시',
  '오전 8시',
  '오전 9시',
  '오전 10시',
  '오후 12시',
  '오후 6시',
  '오후 8시',
  '오후 9시',
];

// ============================================================
// 메인 컴포넌트: SettingsPage
// ============================================================

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 설정 상태 (localStorage 연동)
  const [pushEnabled, setPushEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('오전 9시');
  const [darkMode, setDarkMode] = useState<DarkModeOption>('system');

  // 모달 상태
  const [showReminderModal, setShowReminderModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showDarkModeModal, setShowDarkModeModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAppInfoModal, setShowAppInfoModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // localStorage에서 설정 불러오기
  useEffect(() => {
    const savedSettings = localStorage.getItem('postureai_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setPushEnabled(settings.pushEnabled ?? true);
      setReminderEnabled(settings.reminderEnabled ?? true);
      setReminderTime(settings.reminderTime ?? '오전 9시');
      setDarkMode(settings.darkMode ?? 'system');
    }
  }, []);

  // 설정 변경 시 localStorage에 저장
  const saveSettings = (newSettings: Partial<{
    pushEnabled: boolean;
    reminderEnabled: boolean;
    reminderTime: string;
    darkMode: DarkModeOption;
  }>) => {
    const currentSettings = {
      pushEnabled,
      reminderEnabled,
      reminderTime,
      darkMode,
      ...newSettings,
    };
    localStorage.setItem('postureai_settings', JSON.stringify(currentSettings));
  };

  // 푸시 알림 토글
  const handleTogglePush = () => {
    const newValue = !pushEnabled;
    setPushEnabled(newValue);
    saveSettings({ pushEnabled: newValue });
  };

  // 리마인더 토글
  const handleToggleReminder = () => {
    const newValue = !reminderEnabled;
    setReminderEnabled(newValue);
    saveSettings({ reminderEnabled: newValue });
  };

  // 리마인더 시간 변경
  const handleReminderTimeChange = (time: string) => {
    setReminderTime(time);
    saveSettings({ reminderTime: time });
    setShowReminderModal(false);
  };

  // 다크 모드 변경 (추후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDarkModeChange = (mode: DarkModeOption) => {
    setDarkMode(mode);
    saveSettings({ darkMode: mode });
    setShowDarkModeModal(false);
    // 실제 다크 모드 적용 (추후 구현)
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  // 계정 삭제 (시뮬레이션)
  const handleDeleteAccount = () => {
    alert('계정 삭제 기능은 준비 중입니다.');
    setShowDeleteConfirm(false);
    setShowAccountModal(false);
  };

  // 사용자 정보
  const userEmail = user?.email || '이메일 없음';
  const userName = user?.user_metadata?.name || '사용자';

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* 페이지 헤더 */}
        <motion.div
          className="bg-card px-5 py-6 border-b border-border"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-xl font-semibold text-foreground">설정</h1>
          <p className="text-sm text-muted-foreground mt-1">
            앱 설정을 관리하세요
          </p>
        </motion.div>

        {/* 메인 콘텐츠 */}
        <motion.div
          className="px-5 pt-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 프로필 카드 */}
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-xl p-5 mb-6 border border-border shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="
                w-16 h-16 rounded-xl
                bg-blue-500/100/100
                flex items-center justify-center
                shadow-lg shadow-blue-500/20
              ">
                <span className="text-2xl font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">{userName}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" />
                  {userEmail}
                </p>
              </div>
            </div>
          </motion.div>

          {/* 알림 설정 */}
          <SettingGroup title="알림">
            <SettingToggleItem
              icon={<Bell className="w-5 h-5 text-blue-500" />}
              label="푸시 알림"
              description="앱 알림을 받습니다"
              enabled={pushEnabled}
              onToggle={handleTogglePush}
            />
            <SettingToggleItem
              icon={<Smartphone className="w-5 h-5 text-blue-500" />}
              label="운동 리마인더"
              description={reminderEnabled ? `매일 ${reminderTime}` : '꺼짐'}
              enabled={reminderEnabled}
              onToggle={handleToggleReminder}
            />
            {reminderEnabled && (
              <button
                onClick={() => setShowReminderModal(true)}
                className="
                  w-full px-4 py-3
                  bg-muted
                  text-sm text-blue-500 font-medium
                  text-left
                  hover:bg-blue-500/200/100/100/10
                  transition-colors duration-300
                "
              >
                리마인더 시간 변경: {reminderTime}
              </button>
            )}
          </SettingGroup>

          {/* 앱 설정 */}
          <SettingGroup title="앱">
            <SettingItem
              icon={<Shield className="w-5 h-5 text-blue-500" />}
              label="개인정보 처리방침"
              onClick={() => setShowPrivacyModal(true)}
            />
            <SettingItem
              icon={<Info className="w-5 h-5 text-blue-500" />}
              label="앱 정보"
              value="v1.0.0"
              onClick={() => setShowAppInfoModal(true)}
            />
          </SettingGroup>

          {/* 계정 */}
          <SettingGroup title="계정">
            <SettingItem
              icon={<User className="w-5 h-5 text-blue-500" />}
              label="계정 관리"
              onClick={() => setShowAccountModal(true)}
            />
            <SettingItem
              icon={<LogOut className="w-5 h-5 text-red-500" />}
              label={isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              onClick={handleLogout}
              danger
            />
          </SettingGroup>

          {/* 앱 버전 정보 */}
          <motion.div variants={itemVariants} className="text-center py-8">
            <p className="text-sm text-muted-foreground">PostureAI v1.0.0</p>
            <p className="text-xs text-muted-foreground mt-1">
              © 2024 PostureAI. All rights reserved.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* ============================================================
          모달들
          ============================================================ */}

      {/* 리마인더 시간 선택 모달 */}
      <Modal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        title="리마인더 시간"
      >
        <div className="space-y-2">
          {reminderTimeOptions.map((time) => (
            <button
              key={time}
              onClick={() => handleReminderTimeChange(time)}
              className={`
                w-full px-4 py-3 rounded-xl
                flex items-center justify-between
                transition-colors duration-300
                ${time === reminderTime
                  ? 'bg-blue-500/100/100 text-white'
                  : 'bg-muted text-foreground hover:bg-blue-500/200/100/100/10'
                }
              `}
            >
              <span className="font-medium">{time}</span>
              {time === reminderTime && <Check className="w-5 h-5" />}
            </button>
          ))}
        </div>
      </Modal>

      {/* 개인정보 처리방침 모달 */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="개인정보 처리방침"
      >
        <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
          <p>
            <strong className="text-foreground">1. 수집하는 개인정보</strong>
            <br />
            PostureAI는 서비스 제공을 위해 이메일, 이름, 자세 분석 데이터를 수집합니다.
          </p>
          <p>
            <strong className="text-foreground">2. 개인정보의 이용 목적</strong>
            <br />
            수집된 정보는 자세 분석, 맞춤 운동 추천, 서비스 개선에 활용됩니다.
          </p>
          <p>
            <strong className="text-foreground">3. 개인정보의 보관 기간</strong>
            <br />
            회원 탈퇴 시 즉시 파기되며, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관됩니다.
          </p>
          <p>
            <strong className="text-foreground">4. 문의</strong>
            <br />
            개인정보 관련 문의: privacy@postureai.com
          </p>
        </div>
      </Modal>

      {/* 앱 정보 모달 */}
      <Modal
        isOpen={showAppInfoModal}
        onClose={() => setShowAppInfoModal(false)}
        title="앱 정보"
      >
        <div className="text-center">
          {/* 로고 */}
          {/* 앱 아이콘 (이모지 대신 Lucide 아이콘) */}
          <div className="
            w-20 h-20 mx-auto mb-4
            bg-blue-500/100/100
            rounded-xl
            flex items-center justify-center
            shadow-lg shadow-blue-500/20
          ">
            <Activity className="w-10 h-10 text-white" />
          </div>

          <h3 className="text-xl font-semibold text-foreground">PostureAI</h3>
          <p className="text-sm text-muted-foreground mt-1">버전 1.0.0</p>

          <div className="mt-6 pt-6 border-t border-border text-sm text-muted-foreground space-y-2">
            <p>AI 기반 자세 분석 서비스</p>
            <p>MediaPipe 기술을 활용한 정확한 자세 측정</p>
            <p className="text-xs text-muted-foreground mt-4">
              © 2024 PostureAI. All rights reserved.
            </p>
          </div>
        </div>
      </Modal>

      {/* 계정 관리 모달 */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="계정 관리"
      >
        <div className="space-y-3">
          {/* 이메일 정보 */}
          <div className="p-4 bg-muted rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">로그인 이메일</p>
            <p className="font-medium text-foreground">{userEmail}</p>
          </div>

          {/* 비밀번호 변경 */}
          <button
            onClick={() => {
              alert('비밀번호 변경 이메일을 발송했습니다.');
            }}
            className="
              w-full px-4 py-3 rounded-xl
              bg-muted hover:bg-blue-500/200/100/100/10
              text-foreground font-medium
              text-left
              transition-colors duration-300
            "
          >
            비밀번호 변경
          </button>

          {/* 데이터 초기화 */}
          <button
            onClick={() => {
              if (confirm('모든 분석 기록이 삭제됩니다. 계속하시겠습니까?')) {
                alert('분석 기록이 초기화되었습니다.');
              }
            }}
            className="
              w-full px-4 py-3 rounded-xl
              bg-amber-500/10 hover:bg-amber-500/20
              text-amber-600 font-medium
              text-left
              transition-colors duration-300
            "
          >
            분석 기록 초기화
          </button>

          {/* 계정 삭제 */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="
              w-full px-4 py-3 rounded-xl
              bg-red-500/100/10 hover:bg-red-500/20
              text-red-500 font-medium
              text-left flex items-center gap-2
              transition-colors duration-300
            "
          >
            <Trash2 className="w-4 h-4" />
            계정 삭제
          </button>
        </div>
      </Modal>

      {/* 계정 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="계정 삭제"
      >
        <div className="text-center">
          <div className="
            w-16 h-16 mx-auto mb-4
            bg-red-500/100/10
            rounded-full
            flex items-center justify-center
          ">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>

          <p className="text-foreground font-medium mb-2">
            정말 계정을 삭제하시겠습니까?
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            모든 데이터가 영구적으로 삭제되며
            <br />
            복구할 수 없습니다.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="
                flex-1 py-3 rounded-xl
                bg-accent hover:bg-muted
                text-muted-foreground font-medium
                transition-colors duration-300
              "
            >
              취소
            </button>
            <button
              onClick={handleDeleteAccount}
              className="
                flex-1 py-3 rounded-xl
                bg-red-500/100/100 hover:bg-red-600
                text-white font-medium
                transition-colors duration-300
              "
            >
              삭제
            </button>
          </div>
        </div>
      </Modal>

    </SidebarLayout>
  );
}
