import { useEffect, useState } from "react";
import {
  getReputation,
  submitRating,
  getEscrowStatus,
} from "../services/reputationService";

export const useReputation = (userId: string, escrowId?: string) => {
  const [rating, setRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [escrowReleased, setEscrowReleased] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const rep = await getReputation(userId);
      setRating(rep.rating);
      setTotalReviews(rep.totalReviews);

      if (escrowId) {
        const escrow = await getEscrowStatus(escrowId);
        setEscrowReleased(escrow.status === "released");
      }
    };

    fetchData();
  }, [userId, escrowId]);

  const handleSubmit = async (rating: number, feedback: string) => {
    if (!escrowReleased) {
      throw new Error("Escrow not released");
    }

    setLoading(true);
    await submitRating({ escrowId: escrowId!, rating, feedback });
    setLoading(false);
  };

  return {
    rating,
    totalReviews,
    escrowReleased,
    loading,
    handleSubmit,
  };
};