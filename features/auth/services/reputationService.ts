import axios from "../lib/axios";

export const getReputation = async (userId: string) => {
  const res = await axios.get(`/api/reputation/${userId}`);
  return res.data;
};

export const submitRating = async (data: {
  escrowId: string;
  rating: number;
  feedback: string;
}) => {
  const res = await axios.post(`/api/reputation`, data);
  return res.data;
};

export const getEscrowStatus = async (escrowId: string) => {
  const res = await axios.get(`/api/escrow/${escrowId}`);
  return res.data;
};