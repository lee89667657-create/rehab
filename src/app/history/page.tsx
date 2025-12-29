/**
 * 기록 페이지 - Calm 스타일
 *
 * Supabase 기록과 localStorage 기록을 함께 표시합니다.
 * 각 기록 카드에 촬영 이미지 썸네일을 표시합니다.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, ChevronRight, Trash2, Loader2, User, BarChart3, ImageIcon, PieChart } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { getAnalysisHistory, deleteAnalysisResult, type AnalysisResultRow } from '@/lib/supabase';

// shadcn/ui 컴포넌트
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================
// localStorage 기록 타입 정의
// ============================================================

interface LocalAnalysisRecord {
  id: string;
  date: string;
  score: number;
  postureType?: string | null;
  capturedImages?: {
    front: string | null;
    side: string | null;
    back: string | null;
  };
  landmarks?: Record<string, unknown>;
  items?: Array<{
    id: string;
    name: string;
    score: number;
    grade: string;
  }>;
}

// ============================================================
// 애니메이션 설정
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
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

// ============================================================
// 메인 컴포넌트: HistoryPage
// ============================================================

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [supabaseRecords, setSupabaseRecords] = useState<AnalysisResultRow[]>([]);
  const [localRecords, setLocalRecords] = useState<LocalAnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ============================================================
  // Supabase 기록 상세 보기
  // ============================================================
  const handleViewSupabaseRecord = (record: AnalysisResultRow) => {
    localStorage.setItem('viewingRecord', JSON.stringify(record));
    router.push('/result?from=history');
  };

  // ============================================================
  // localStorage 기록 상세 보기
  // ============================================================
  const handleViewLocalRecord = (record: LocalAnalysisRecord) => {
    localStorage.setItem('viewingRecord', JSON.stringify(record));
    router.push('/result?from=history');
  };

  // ============================================================
  // Supabase 기록 삭제
  // ============================================================
  const handleDeleteSupabase = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    setDeletingId(id);
    try {
      await deleteAnalysisResult(id);
      setSupabaseRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================
  // localStorage 기록 삭제
  // ============================================================
  const handleDeleteLocal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    setDeletingId(id);
    try {
      const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
      const filtered = history.filter((r: LocalAnalysisRecord) => r.id !== id);
      localStorage.setItem('analysisHistory', JSON.stringify(filtered));
      setLocalRecords(filtered);
    } catch (error) {
      console.error('Failed to delete local record:', error);
      alert('삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================
  // 분석 기록 불러오기 (Supabase + localStorage)
  // ============================================================
  useEffect(() => {
    const fetchRecords = async () => {
      // localStorage 기록 불러오기 (항상 수행)
      try {
        const localHistory = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
        setLocalRecords(localHistory);
      } catch (e) {
        console.error('Failed to load local history:', e);
      }

      // Supabase 기록 불러오기 (로그인한 경우만)
      if (user) {
        try {
          const data = await getAnalysisHistory(user.id);
          setSupabaseRecords(data || []);
        } catch (error) {
          console.error('Failed to fetch history:', error);
        }
      }

      setIsLoading(false);
    };

    fetchRecords();
  }, [user]);

  // 전체 기록 수
  const totalRecords = supabaseRecords.length + localRecords.length;

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekDay = weekDays[date.getDay()];
    return `${month}월 ${day}일 (${weekDay})`;
  };

  // 점수에 따른 Badge variant
  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <>
      <AppHeader />

      <div className="min-h-screen bg-slate-50 pb-24 pt-14">
        {/* 페이지 헤더 */}
        <motion.div
          className="bg-white px-5 py-6 border-b border-gray-100"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">기록</h1>
              <p className="text-sm text-gray-500 mt-1">
                자세 분석 기록을 확인하세요
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/stats')}
              className="flex items-center gap-1"
            >
              <PieChart className="w-4 h-4" />
              통계
            </Button>
          </div>
        </motion.div>

        {/* 메인 콘텐츠 */}
        <motion.div
          className="px-5 pt-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {isLoading ? (
            /* 로딩 상태 */
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-16 h-20 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : totalRecords > 0 ? (
            /* 기록이 있을 때 */
            <div className="space-y-4">
              {/* ============================================================ */}
              {/* localStorage 기록 (최근 분석) */}
              {/* ============================================================ */}
              {localRecords.map((record) => (
                <motion.div key={`local-${record.id}`} variants={itemVariants}>
                  <Card
                    onClick={() => handleViewLocalRecord(record)}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* 썸네일 - 촬영 이미지 표시 */}
                        <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {record.capturedImages?.front ? (
                            <img
                              src={record.capturedImages.front}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(record.date)}
                          </div>

                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-bold text-foreground">
                              {record.score}
                            </span>
                            <span className="text-sm text-muted-foreground">점</span>
                            <Badge variant={getScoreBadgeVariant(record.score)} className="text-[10px]">
                              {record.score >= 80 ? '양호' : record.score >= 60 ? '주의' : '경고'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {record.postureType || '자세 분석'}
                            </span>
                          </div>
                        </div>

                        {/* 오른쪽 액션 */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteLocal(e, record.id)}
                            disabled={deletingId === record.id}
                            className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                          >
                            {deletingId === record.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>

                          <div className="w-9 h-9 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* ============================================================ */}
              {/* Supabase 기록 (클라우드 동기화) */}
              {/* ============================================================ */}
              {supabaseRecords.map((record) => (
                <motion.div key={`supabase-${record.id}`} variants={itemVariants}>
                  <Card
                    onClick={() => handleViewSupabaseRecord(record)}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* 썸네일 */}
                        <div className="w-16 h-20 bg-muted rounded-xl overflow-hidden flex-shrink-0">
                          {record.pose_data && typeof record.pose_data === 'object' && 'capturedImage' in record.pose_data ? (
                            <img
                              src={(record.pose_data as { capturedImage?: string }).capturedImage}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                              <User className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(record.created_at)}
                          </div>

                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-bold text-foreground">
                              {record.overall_score}
                            </span>
                            <span className="text-sm text-muted-foreground">점</span>
                            <Badge variant={getScoreBadgeVariant(record.overall_score)} className="text-[10px]">
                              {record.overall_score >= 80 ? '양호' : record.overall_score >= 60 ? '주의' : '경고'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {[record.head_forward, record.shoulder_balance, record.pelvic_tilt, record.knee_alignment]
                                .filter((score) => score >= 80).length}개 정상 / 4개 항목
                            </span>
                          </div>
                        </div>

                        {/* 오른쪽 액션 */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteSupabase(e, record.id)}
                            disabled={deletingId === record.id}
                            className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                          >
                            {deletingId === record.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>

                          <div className="w-9 h-9 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            /* 기록이 없을 때 */
            <motion.div variants={itemVariants}>
              <Card className="text-center">
                <CardContent className="p-8">
                  {/* 아이콘 (이모지 대신 Lucide 아이콘) */}
                  <div className="w-20 h-20 mx-auto mb-5 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-10 h-10 text-primary" />
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    아직 분석 기록이 없습니다
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    자세 분석을 시작하면
                    <br />
                    이곳에서 기록을 확인할 수 있어요!
                  </p>

                  <Button
                    onClick={() => router.push('/analyze')}
                    size="lg"
                    className="font-semibold"
                  >
                    자세 분석 시작하기
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
}
