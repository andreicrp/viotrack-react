

export const coreMethods = {
  async warmCache() {
      try {
        await Promise.allSettled([
          this.getStudents(),
          this.getViolations(),
          this.getRecords(),
          this.getTeachers(),
          this.getAdvisers(),
          this.getSchoolEvents(),
          this.getAdmins(),
          this.getActivityLogs()
        ]);
      } catch (e) {
        console.warn('Background cache warming warning:', e);
      }
    }
};
