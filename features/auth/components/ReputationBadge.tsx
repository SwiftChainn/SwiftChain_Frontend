import { useState } from "react";
import { useReputation } from "../hooks/useReputation";

export const ReputationBadge = ({ userId, escrowId, onChange }: any) => {
  const {
    rating,
    totalReviews,
    escrowReleased,
    handleSubmit,
    loading,
  } = useReputation(userId, escrowId);

  const [modalOpen, setModalOpen] = useState(false);
  const [value, setValue] = useState(0);
  const [feedback, setFeedback] = useState("");

  return (
    <div className="p-4 border rounded-xl">
      <div className="flex items-center gap-2">
        <span className="text-yellow-400">★</span>
        <span>{rating.toFixed(1)}</span>
        <span className="text-gray-500">({totalReviews})</span>
      </div>

      <button
        onClick={() => setModalOpen(true)}
        disabled={!escrowReleased}
        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        Leave Feedback
      </button>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg w-80">
            <h2 className="font-semibold mb-2">Rate Experience</h2>

             <div className="flex gap-1">
             {[1,2,3,4,5].map((star) => (
            <button
             key={star}
             onClick={() => onChange(star)}
             className={star <= value ? "text-yellow-400" : "text-gray-300"}
             >
             ★
            </button>
             ))}
            </div>

            <textarea
              className="w-full mt-2 border p-2 rounded"
              placeholder="Write feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />

            <button
              onClick={async () => {
                await handleSubmit(value, feedback);
                setModalOpen(false);
              }}
              disabled={loading}
              className="mt-3 w-full bg-green-500 text-white py-2 rounded"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};