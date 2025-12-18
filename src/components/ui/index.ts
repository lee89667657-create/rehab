/**
 * UI 컴포넌트 통합 export
 *
 * 이 파일에서 모든 UI 컴포넌트를 한 곳에서 import할 수 있습니다.
 *
 * @example
 * import { Button, Card, Badge, Progress } from '@/components/ui';
 */

// Button 컴포넌트
export { Button, buttonVariants } from './button';

// Card 컴포넌트 및 하위 컴포넌트들
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

// Badge 컴포넌트
export { Badge, badgeVariants } from './badge';

// Progress 컴포넌트
export { Progress } from './progress';

// Alert 컴포넌트
export { Alert, AlertTitle, AlertDescription } from './alert';

// Avatar 컴포넌트
export { Avatar, AvatarImage, AvatarFallback } from './avatar';

// Tabs 컴포넌트
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

// Skeleton 컴포넌트
export { Skeleton } from './skeleton';
