import { CACHE_CONFIG, _cache, executeWithDeduplication } from './shared.js';

export const dashboardMethods = {
  async getDashboardStats(forceRefresh = false) {
      const now = Date.now();
      const cached = _cache.data.dashboard_stats;
      const cacheAge = now - _cache.timestamps.dashboard_stats;
  
      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
        return cached;
      }
  
      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
        this.getDashboardStats(true).catch(() => {});
        return cached;
      }
  
      return executeWithDeduplication('dashboard_stats', async () => {
        const [students, records, events] = await Promise.all([
          this.getStudents(),
          this.getRecords(),
          this.getSchoolEvents()
        ]);
  
        const approvedRecords = (records || []).filter(r => r.approval_status === 'Approved');
        const underApprovalCount = (records || []).filter(r => r.approval_status === 'Under Approval' || r.status === 'Under Approval').length;
        const pendingCount = approvedRecords.filter(r => r.status === 'Pending').length;
        const resolvedCount = approvedRecords.filter(r => r.status === 'Resolved').length;
        const investigationCount = approvedRecords.filter(r => r.status === 'Investigation').length;
  
        let minorCount = 0;
        let seriousCount = 0;
        let majorCount = 0;
  
        const infractionMap = new Map();
  
        for (const r of approvedRecords) {
          const type = (r.violation?.type || 'Minor').toLowerCase();
          if (type.includes('major')) majorCount++;
          else if (type.includes('serious')) seriousCount++;
          else minorCount++;
  
          const sId = r.student_id;
          if (sId) {
            const current = infractionMap.get(sId) || { count: 0, student: r.student, records: [] };
            current.count++;
            if (r.student) current.student = r.student;
            current.records.push(r);
            infractionMap.set(sId, current);
          }
        }
  
        const repeatOffenders = Array.from(infractionMap.values())
          .filter(item => item.count >= 2 && item.student)
          .sort((a, b) => b.count - a.count);
  
        const stats = {
          totalStudents: (students || []).length,
          totalViolations: approvedRecords.length,
          pendingViolations: pendingCount,
          resolvedViolations: resolvedCount,
          investigationViolations: investigationCount,
          underApprovalViolations: underApprovalCount,
          minorCount,
          seriousCount,
          majorCount,
          repeatOffenders,
          schoolEvents: events || [],
          calculatedAt: new Date().toISOString()
        };
  
        _cache.data.dashboard_stats = stats;
        _cache.timestamps.dashboard_stats = Date.now();
        return stats;
      });
    }
};
