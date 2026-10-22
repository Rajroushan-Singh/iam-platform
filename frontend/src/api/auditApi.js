import { httpClient } from './httpClient';

export const auditApi = {
  /**
   * Fetch recent audit events (Admin only)
   * @returns {Promise<Array<{ id: number, email: string|null, eventType: string, successful: boolean, ipAddress: string|null, details: string|null, createdAt: string }>>}
   */
  async getRecentEvents() {
    const response = await httpClient.get('/api/admin/audit');
    return response.data;
  },

  /**
   * Fetch audit events for a specific email (Admin only)
   * @param {string} email
   */
  async getEventsForEmail(email) {
    const response = await httpClient.get(`/api/admin/audit/email/${encodeURIComponent(email)}`);
    return response.data;
  },

  /**
   * Fetch admin dashboard status / verification
   */
  async getAdminDashboard() {
    const response = await httpClient.get('/api/admin/dashboard');
    return response.data;
  },
};
