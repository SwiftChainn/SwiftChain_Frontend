import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface BreadcrumbData {
  label: string;
  href: string;
}

export const breadcrumbService = {
  async getResourceName(type: string, id: string): Promise<string> {
    try {
      // Example endpoint: /deliveries/:id
      const response = await axios.get(`${API_URL}/${type}/${id}`);
      return response.data.name || response.data.title || id;
    } catch (error) {
      console.error(`Error fetching ${type} name:`, error);
      return id; // Fallback to ID
    }
  }
};
