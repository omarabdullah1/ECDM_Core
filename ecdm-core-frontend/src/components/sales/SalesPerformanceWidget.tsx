'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuth';

interface PerformanceData {
  targetAmount: number;
  achievedAmount: number;
  progressPercentage: number;
  month: number;
  year: number;
}

export function SalesPerformanceWidget() {
  const { user } = useAuthStore();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPerformance = async () => {
      if (!user?._id) return;

      try {
        setLoading(true);
        const { data } = await api.get('/sales/targets/performance', {
          params: { salespersonId: user._id },
        });
        setPerformance(data.data);
        setError('');
      } catch (err: unknown) {
        console.error('Failed to fetch performance:', err);
        setError('Could not load performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [user?._id]);

  if (!user) return null;

  // Only show for sales roles
  if (user.role !== 'Sales' && user.role !== 'Manager' && user.role !== 'SuperAdmin') {
    return null;
  }

  if (loading) {
    return (
      <Card className="mb-4 bg-gradient-to-r from-blue-50 to-white shadow-sm border-blue-100 dark:from-blue-950 dark:to-gray-900 dark:border-blue-900">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading performance data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !performance) {
    return (
      <Card className="mb-4 bg-gradient-to-r from-gray-50 to-white shadow-sm border-gray-200 dark:from-gray-900 dark:to-gray-900 dark:border-gray-800">
        <CardContent className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {error || 'No performance data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const monthName = new Date(performance.year, performance.month - 1).toLocaleString('default', { 
    month: 'long' 
  });

  return (
    <Card className="mb-4 bg-gradient-to-r from-blue-50 to-white shadow-sm border-blue-100 dark:from-blue-950 dark:to-gray-900 dark:border-blue-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Target className="w-4 h-4" /> 
          {monthName} {performance.year} Sales Target
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
            <span>Achieved: ${performance.achievedAmount.toLocaleString()}</span>
            <span>Target: ${performance.targetAmount.toLocaleString()}</span>
          </div>
          
          <Progress 
            value={performance.progressPercentage} 
            max={100}
            className="h-3 bg-blue-100 dark:bg-blue-900"
            indicatorClassName="bg-blue-600 dark:bg-blue-400"
          />
          
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" /> 
            {performance.progressPercentage}% of your monthly goal reached. Keep it up!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
