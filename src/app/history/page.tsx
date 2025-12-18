/**
 * 기록 페이지 - shadcn/ui 스타일
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, ChevronRight, Trash2, Loader2, User, BarChart3 } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { getAnalysisHistory, deleteAnalysisResult, type AnalysisResultRow } from '@/lib/supabase';

// shadcn/ui 컴포넌트
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [records, setRecords] = useState<AnalysisResultRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 기록 상세 보기
  const handleViewRecord = (record: AnalysisResultRow) => {
    localStorage.setItem('viewingRecord', JSON.stringify(record));
    router.push('/result?from=history');
  };

  // 기록 삭제
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    setDeletingId(id);
    try {
      await deleteAnalysisResult(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setDeletingId(null);
    }
  };

  // 분석 기록 불러오기
  useEffect(() => {
    const fetchRecords = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getAnalysisHistory(user.id);
        setRecords(data || []);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [user]);

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

      <div className="min-h-screen bg-background pb-24 pt-14">
        {/* 페이지 헤더 */}
        <motion.div
          className="bg-card px-5 py-6 border-b"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground">기록</h1>
          <p className="text-sm text-muted-foreground mt-1">
            자세 분석 기록을 확인하세요
          </p>
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
          ) : records.length > 0 ? (
            /* 기록이 있을 때 */
            <div className="space-y-4">
              {records.map((record) => (
                <motion.div key={record.id} variants={itemVariants}>
                  <Card
                    onClick={() => handleViewRecord(record)}
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
                            onClick={(e) => handleDelete(e, record.id)}
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
