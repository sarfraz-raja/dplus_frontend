// pages/DiscussionForum/DiscussionPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import TopicsTable from "./components/TopicsTable";
import CreateTopicModal from "./components/CreateTopicModal";
import ChatModal from "./components/ChatModal";
import { DiscussionSkeleton } from "./components/Skeletons";
import { EmptyState } from "./components/EmptyState";

const API = "http://192.168.0.100:8060/discussion";

export default function DiscussionPage() {
  const auth = useSelector((s) => s?.auth?.user || {});
  const userId = auth?.id;
  const token = localStorage.getItem("token");

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/topic`, { headers });
      const json = await res.json();
      setTopics(json.data || []);
    } catch (error) {
      console.error("Failed to fetch topics:", error);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleViewTopic = (topic) => {
    setSelectedTopic(topic);
    setChatModalOpen(true);
  };

  const handleOpenDuplicateTopic = (topicId) => {
  // Find the topic in your list or fetch it
  const topic = topics.find(t => t.id === topicId);
  if (topic) {
    setSelectedTopic(topic);
    setChatModalOpen(true);
  } else {
    // If topic not in list, fetch it
    fetchTopicById(topicId);
  }
};


  return (
    <div className="p-6 h-full bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Discussions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Collaborate and share insights with your team
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-200 hover:shadow-xl hover:shadow-blue-600/30 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Topic
        </button>
      </div>

      {/* Topics Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <DiscussionSkeleton />
        ) : topics.length === 0 ? (
          <EmptyState
            title="No discussions yet"
            description="Start a conversation by creating your first topic"
            actionLabel="Create Topic"
            onAction={() => setCreateModalOpen(true)}
          />
        ) : (
          <TopicsTable topics={topics} onViewTopic={handleViewTopic} />
        )}
      </div>

      {/* Modals */}
     <CreateTopicModal
  isOpen={createModalOpen}
  onClose={() => setCreateModalOpen(false)}
  headers={headers}
  onSuccess={fetchTopics}
  onOpenDuplicate={handleOpenDuplicateTopic} // Add this prop
/>

      {selectedTopic && (
        <ChatModal
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          topic={selectedTopic}
          userId={userId}
          headers={headers}
        />
      )}
    </div>
  );
}

