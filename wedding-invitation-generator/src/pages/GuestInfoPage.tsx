/**
 * Guest Information Page
 * 
 * This page allows users to add, edit, and manage guest information.
 * It represents the second step in the invitation workflow, where
 * users build their guest list and provide details about each guest
 * that will be used to personalize invitations.
 * 
 * Key features:
 * - Add new guests with form validation
 * - Edit existing guest information
 * - Delete guests from the list
 * - Real-time UI updates with animations
 * - Form validation using Formik and Yup
 * - API integration for data persistence
 */
import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { GuestInfo, RelationshipType } from '../types';
import api from '../services/api';

/**
 * Validation schema for guest information form
 * 
 * Uses Yup to define validation rules for the guest form:
 * - Required fields: name, relationship, email
 * - Email format validation
 * - Optional fields: preferences, how they met, shared memories
 */
const GuestInfoSchema = Yup.object().shape({
  name: Yup.string().required('請輸入賓客姓名'),
  relationship: Yup.string().required('請選擇與賓客的關係'),
  email: Yup.string().email('請輸入有效的電子郵件地址').required('請輸入電子郵件地址'),
  preferences: Yup.string(),
  howMet: Yup.string(),
  memories: Yup.string()
});

/**
 * Predefined relationship type options
 * 
 * A list of relationship types between the couple and their guests.
 * These options help categorize guests and personalize invitations accordingly.
 */
const relationshipOptions: RelationshipType[] = [
  '親戚',       // Relative
  '朋友',       // Friend
  '同事',       // Colleague
  '家人',       // Family member
  '學校同學',   // School classmate
  '其他'        // Other
];

/**
 * GuestInfoPage Component
 * 
 * Manages the guest information entry flow, including adding new guests,
 * editing existing guests, and preparing for invitation generation.
 * 
 * @returns {JSX.Element} The guest information management page
 */
const GuestInfoPage: React.FC = () => {
  // Access wedding context for state management and navigation
  const { state, dispatch, nextStep, prevStep } = useWedding();
  
  // Local state for UI management
  const [editingGuest, setEditingGuest] = useState<GuestInfo | null>(null);  // Currently editing guest
  const [isLoading, setIsLoading] = useState(false);                         // Loading state indicator
  const [error, setError] = useState<string | null>(null);                   // Error message if any
  
  /**
   * Fetch existing guests from the backend on page load
   * Synchronizes backend data with the application state
   */
  useEffect(() => {
    const fetchGuests = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await api.guests.getAll();
        if (response.data && response.data.length > 0) {
          // If guests exist in the backend, update the frontend state
          response.data.forEach((guest: GuestInfo) => {
            dispatch({
              type: 'ADD_GUEST',
              payload: guest
            });
          });
        }
      } catch (err) {
        console.error('Error fetching guest list:', err);
        setError('無法獲取賓客列表，請稍後再試。');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGuests();
  }, [dispatch]);
  
  /**
   * Initial values for the guest form
   * Default values for a new guest when the form is reset
   */
  const initialValues: Omit<GuestInfo, 'id'> = {
    name: '',
    relationship: '朋友',
    email: '',
    preferences: '',
    howMet: '',
    memories: '',
    status: 'pending'
  };
  
  /**
   * Form submission handler
   * 
   * Handles both adding new guests and updating existing ones
   * Communicates with the backend API and updates the UI accordingly
   * 
   * @param {Omit<GuestInfo, 'id'>} values - Form values from Formik
   * @param {Object} formikHelpers - Formik helper methods
   */
  const handleSubmit = async (values: Omit<GuestInfo, 'id'>, { resetForm, setSubmitting }: { resetForm: () => void, setSubmitting: (isSubmitting: boolean) => void }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // get coupleInfoId, ensure there is valid couple information
      if (!state.coupleInfo || !state.coupleInfo.groomName || !state.coupleInfo.brideName) {
        setError('missing couple information, please fill in the couple information first.');
        setSubmitting(false);
        setIsLoading(false);
        return;
      }
      
      // get coupleInfoId from backend
      try {
        const coupleResponse = await api.couple.get();
        const coupleInfoId = coupleResponse.data?.id;
        
        if (!coupleInfoId) {
          setError('無法獲取新人資料ID，請確保已保存新人資料');
          setSubmitting(false);
          setIsLoading(false);
          return;
        }
        
        if (editingGuest) {
          // Update existing guest
          const guestData = { ...values, id: editingGuest.id, coupleInfoId };
          await api.guests.update(editingGuest.id, guestData);
          
          // Update frontend state
          dispatch({
            type: 'UPDATE_GUEST',
            payload: guestData
          });
          setEditingGuest(null);
        } else {
          // Add new guest
          const newGuest = { ...values, id: crypto.randomUUID(), coupleInfoId };
          const response = await api.guests.add(newGuest);
          
          // Use backend response to update frontend state
          dispatch({
            type: 'ADD_GUEST',
            payload: response.data || newGuest
          });
        }
        
        // Reset form after successful submission
        resetForm();
      } catch (coupleError) {
        console.error('Error getting couple info:', coupleError);
        setError('無法獲取新人資料，請確保已正確填寫並保存新人資料。');
      }
    } catch (err) {
      console.error('Error saving guest information:', err);
      setError('無法保存賓客資料，請稍後再試。');
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };
  
  /**
   * Load guest data for editing
   * 
   * Sets the selected guest in the editing state and populates the form
   * 
   * @param {GuestInfo} guest - The guest to edit
   */
  const handleEdit = (guest: GuestInfo) => {
    setEditingGuest(guest);
    setError(null);
  };
  
  /**
   * Cancel the current editing operation
   * Resets the editing state without saving changes
   */
  const handleCancelEdit = () => {
    setEditingGuest(null);
  };
  
  /**
   * Delete a guest from the system
   * 
   * Confirms with the user before proceeding with deletion
   * Updates both backend and frontend state
   * 
   * @param {string} id - ID of the guest to delete
   */
  const handleDelete = async (id: string) => {
    if (window.confirm('確定要刪除此賓客嗎？')) {
      try {
        setIsLoading(true);
        setError(null);
        
        // Call API to delete guest
        await api.guests.delete(id);
        
        // Update frontend state
        dispatch({ type: 'REMOVE_GUEST', payload: id });
      } catch (err) {
        console.error('Error deleting guest:', err);
        setError('無法刪除賓客，請稍後再試。');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  /**
   * Proceed to the next step in the workflow
   * 
   * Only allows proceeding if at least one guest has been added
   * Shows an alert if trying to proceed with no guests
   */
  const handleNext = () => {
    if (state.guests.length > 0) {
      nextStep();
    } else {
      alert('請至少添加一位賓客');
    }
  };
  
  /**
   * Animation configuration for the page
   * 
   * Defines how the page animates in and out using Framer Motion
   */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.5 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };
  
  /**
   * Animation configuration for guest cards
   * 
   * Defines how guest cards animate when added or removed from the list
   */
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      y: -20,
      transition: { duration: 0.2 }
    }
  };
  
  return (
    <motion.div
      className="min-h-screen py-12 px-4 max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <h1 className="text-3xl font-serif text-center font-bold mb-8 text-wedding-dark">賓客資料輸入</h1>
      
      {/* Progress indicator showing current step */}
      <ProgressIndicator />
      
      {/* Error message display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 flex items-center">
          <svg className="animate-spin h-5 w-5 mr-3 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          處理中...
        </div>
      )}
      
      {/* Two-column layout: form and guest list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Guest information form section */}
        <div className="md:col-span-2">
          <div className="card">
            <h2 className="text-xl font-medium mb-4 text-wedding-dark">
              {editingGuest ? '編輯賓客資料' : '新增賓客'}
            </h2>
            
            {/* 
              Formik Form Component
              
              Handles form state management, validation, and submission:
              - initialValues: Pre-fills with editing guest data or defaults
              - validationSchema: Validates input against defined rules
              - onSubmit: Processes form submission
              - enableReinitialize: Updates form when initialValues changes
            */}
            <Formik
              initialValues={editingGuest || initialValues}
              validationSchema={GuestInfoSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, isValid, dirty }) => (
                <Form className="space-y-4">
                  {/* Guest name field */}
                  <div>
                    <label htmlFor="name" className="label">賓客姓名 *</label>
                    <Field name="name" type="text" className="input-field" />
                    <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1" />
                  </div>
                  
                  {/* Relationship field */}
                  <div>
                    <label htmlFor="relationship" className="label">與新人關係 *</label>
                    <Field name="relationship" as="select" className="input-field">
                      {relationshipOptions.map((relation) => (
                        <option key={relation} value={relation}>{relation}</option>
                      ))}
                    </Field>
                    <ErrorMessage name="relationship" component="div" className="text-red-500 text-xs mt-1" />
                  </div>
                  
                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="label">電子郵件 *</label>
                    <Field name="email" type="email" className="input-field" />
                    <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1" />
                  </div>
                  
                  {/* Guest preferences field (optional) */}
                  <div>
                    <label htmlFor="preferences" className="label">賓客喜好 (選填)</label>
                    <Field 
                      name="preferences" 
                      type="text" 
                      placeholder="例如：喜歡的食物、飲料或活動"
                      className="input-field" 
                    />
                  </div>
                  
                  {/* How you met field (optional) */}
                  <div>
                    <label htmlFor="howMet" className="label">如何認識 (選填)</label>
                    <Field 
                      name="howMet" 
                      type="text" 
                      placeholder="例如：大學同學、公司同事"
                      className="input-field" 
                    />
                  </div>
                  
                  {/* Shared memories field (optional) */}
                  <div>
                    <label htmlFor="memories" className="label">共同回憶 (選填)</label>
                    <Field 
                      name="memories" 
                      as="textarea" 
                      rows={3} 
                      placeholder="例如：一起旅行、一起參加活動的回憶"
                      className="input-field resize-none" 
                    />
                  </div>
                  
                  {/* Form action buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    {/* Cancel button (only shown when editing) */}
                    {editingGuest && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        取消
                      </button>
                    )}
                    {/* Submit button (add/update) */}
                    <button
                      type="submit"
                      disabled={isSubmitting || !(isValid && dirty)}
                      className={`btn-primary ${!(isValid && dirty) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {editingGuest ? '更新賓客' : '新增賓客'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
        
        {/* Guest list section */}
        <div className="md:col-span-1">
          <div className="card h-full overflow-auto">
            <h2 className="text-xl font-medium mb-4 text-wedding-dark">已加入賓客</h2>
            
            {/* Empty state message when no guests exist */}
            {state.guests.length === 0 ? (
              <p className="text-gray-500 text-sm">尚未新增賓客</p>
            ) : (
              <ul className="space-y-3">
                {/* Guest list with animations for each item */}
                {state.guests.map((guest) => (
                  <motion.li
                    key={guest.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <div className="flex justify-between items-start">
                      {/* Guest information */}
                      <div>
                        <h3 className="font-medium">{guest.name}</h3>
                        <p className="text-xs text-gray-500">{guest.relationship} | {guest.email}</p>
                      </div>
                      {/* Action buttons */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(guest)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(guest.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        {/* Back button */}
        <button
          onClick={prevStep}
          className="px-6 py-2 border border-wedding-dark text-wedding-dark rounded-lg hover:bg-wedding-dark hover:text-white transition-colors"
        >
          上一步
        </button>
        {/* Next button (disabled if no guests) */}
        <button
          onClick={handleNext}
          className={`btn-primary ${state.guests.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={state.guests.length === 0}
        >
          下一步
        </button>
      </div>
    </motion.div>
  );
};

export default GuestInfoPage; 