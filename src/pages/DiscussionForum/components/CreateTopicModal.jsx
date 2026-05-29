// pages/DiscussionForum/components/CreateTopicModal.jsx
import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { toast } from "react-hot-toast"; // or your preferred toast library
import DuplicateTopicModal from "./DuplicateTopicModal";
import ErrorAlert from "./ErrorAlert";
import DatasetTypeToggle from "./DatasetTypeToggle";
import SearchableMultiSelect from "./SearchableMultiSelect";

const API = "http://192.168.0.100:8060/discussion";

const INITIAL_FORM_STATE = {
  datasetType: "SITE",
  title: "",
  description: "",
  siteName: "",
  cellNames: [],
  users: [],
};

const INITIAL_ERROR_STATE = {
  field: null,
  message: null,
  type: null, // 'validation', 'server', 'network', 'duplicate', 'permission'
  data: null,
};

export default function CreateTopicModal({ isOpen, onClose, headers, onSuccess }) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(INITIAL_ERROR_STATE);
  const [loading, setLoading] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  
  const [siteList, setSiteList] = useState([]);
  const [cellList, setCellList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch dropdown options when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [siteRes, cellRes, userRes] = await Promise.all([
        fetch(`${API}/siteList`),
        fetch(`${API}/cellList`),
        fetch(`${API}/users`, { headers })
      ]);

      const siteJson = await siteRes.json();
      const cellJson = await cellRes.json();
      const userJson = await userRes.json();

      setSiteList(siteJson.data || []);
      setCellList(cellJson.data || []);
      setUserList(userJson.data || []);
    } catch (error) {
      toast.error("Failed to load form options");
    } finally {
      setLoadingOptions(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setFieldErrors({});
    setError(INITIAL_ERROR_STATE);
    setDuplicateData(null);
  };

  // Client-side validation
  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }

    if (formData.datasetType === "SITE" && !formData.siteName) {
      errors.siteName = "Please select a site";
    }

    if (formData.cellNames.length === 0) {
      errors.cellNames = "Select at least one cell";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setError(INITIAL_ERROR_STATE);
    
    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/topic`, {
        method: "POST",
        headers,
        body: JSON.stringify(formData),
      });

      const json = await response.json();

      // Handle different response statuses
      switch (response.status) {
        case 200:
        case 201:
          // Success
          toast.success("Topic created successfully");
          onSuccess();
          onClose();
          break;

        case 400:
          // Validation error
          setError({
            field: null,
            message: json.msg || "Validation failed",
            type: "validation",
            data: json.data
          });
          
          // If backend returns field-specific errors
          if (json.errors) {
            setFieldErrors(json.errors);
          }
          
          // Special case: invalid cell selection
          if (json.msg?.includes("cells do not belong")) {
            setError(prev => ({ ...prev, type: "invalid-cells" }));
          }
          
          // Special case: cells not found
          if (json.msg?.includes("cells not found")) {
            setError(prev => ({ ...prev, type: "cells-not-found" }));
          }
          break;

        case 403:
          // Permission denied
          setError({
            field: null,
            message: json.msg || "You don't have permission to create topics",
            type: "permission",
            data: json.data
          });
          setTimeout(() => onClose(), 3000);
          break;

        case 409:
          // Duplicate topic
          if (json.state === 2) {
            setDuplicateData({
              topicId: json.data?.topicId,
              message: json.msg || "Similar topic already exists"
            });
            setShowDuplicateModal(true);
          }
          break;

        default:
          // Unexpected error
          setError({
            field: null,
            message: json.msg || "An unexpected error occurred",
            type: "server",
            data: json.data
          });
      }
    } catch (error) {
      // Network error
      setError({
        field: null,
        message: "Network error. Please check your connection.",
        type: "network",
        data: null
      });
      toast.error("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDuplicate = () => {
    setShowDuplicateModal(false);
    onClose();
    // This will trigger opening the chat modal in the parent
    if (duplicateData?.topicId) {
      // You'll need to pass this up to the parent
      // This could be done via a callback prop
      if (window.openDuplicateTopic) {
        window.openDuplicateTopic(duplicateData.topicId);
      }
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
    // Clear general error when user makes changes
    if (error.type) {
      setError(INITIAL_ERROR_STATE);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} setIsOpen={onClose} size="lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Create New Topic
          </h2>
          
          {/* Error Alert */}
          {error.message && error.type !== "duplicate" && (
            <ErrorAlert
              message={error.message}
              type={error.type}
              onDismiss={() => setError(INITIAL_ERROR_STATE)}
            />
          )}

          {/* Loading Options State */}
          {loadingOptions && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading options...</span>
            </div>
          )}

          {!loadingOptions && (
            <div className="space-y-6">
              {/* Dataset Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dataset Type <span className="text-red-500">*</span>
                </label>
                <DatasetTypeToggle
                  value={formData.datasetType}
                  onChange={(value) => handleFieldChange("datasetType", value)}
                />
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                    fieldErrors.title
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500"
                  }`}
                  placeholder="Enter topic title"
                  value={formData.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.title && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>
                )}
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Describe the topic (optional)"
                  value={formData.description}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Site Selection (only for SITE type) */}
              {formData.datasetType === "SITE" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      fieldErrors.siteName
                        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-blue-500"
                    }`}
                    value={formData.siteName}
                    onChange={(e) => handleFieldChange("siteName", e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Select a site</option>
                    {siteList.map((site) => (
                      <option key={site.siteName} value={site.siteName}>
                        {site.siteName}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.siteName && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.siteName}</p>
                  )}
                </div>
              )}

              {/* Cells Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cells <span className="text-red-500">*</span>
                </label>
                <SearchableMultiSelect
                  options={cellList.map(cell => ({ id: cell, label: cell }))}
                  value={formData.cellNames}
                  onChange={(value) => handleFieldChange("cellNames", value)}
                  placeholder="Select cells..."
                  disabled={loading}
                  error={fieldErrors.cellNames}
                />
                {fieldErrors.cellNames && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.cellNames}</p>
                )}
              </div>

              {/* Participants Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participants
                </label>
                <SearchableMultiSelect
                  options={userList}
                  value={formData.users}
                  onChange={(value) => handleFieldChange("users", value)}
                  placeholder="Add participants (optional)"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || loadingOptions}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[100px] flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Topic"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Duplicate Topic Modal */}
      {showDuplicateModal && duplicateData && (
        <DuplicateTopicModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          message={duplicateData.message}
          onOpenExisting={handleOpenDuplicate}
          onCancel={() => setShowDuplicateModal(false)}
        />
      )}
    </>
  );
}