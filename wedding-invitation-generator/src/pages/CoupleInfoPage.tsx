/**
 * Couple Information Page
 * 
 * This page collects essential information about the wedding couple.
 * It represents the first interactive step in the invitation creation workflow
 * where users provide details used to generate personalized invitations.
 * 
 * Features:
 * - Form validation using Formik and Yup
 * - Responsive layout with Tailwind CSS
 * - API integration for data persistence
 * - Error handling for form submission
 */
import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { CoupleInfo } from '../types';
import api from '../services/api';

/**
 * Validation schema for the couple information form
 * 
 * Uses Yup, a schema validation library, to define validation rules:
 * - Required fields: names, date, time, location, theme
 * - Background story is optional
 */
const CoupleInfoSchema = Yup.object().shape({
  groomName: Yup.string().required('請輸入新郎姓名'),
  brideName: Yup.string().required('請輸入新娘姓名'),
  weddingDate: Yup.date().required('請選擇婚禮日期').nullable(),
  weddingTime: Yup.string().required('請選擇婚禮時間'),
  weddingLocation: Yup.string().required('請輸入婚禮地點'),
  weddingTheme: Yup.string().required('請選擇或輸入婚禮主題'),
  backgroundStory: Yup.string()
});

/**
 * Predefined wedding theme options
 * 
 * A list of common wedding theme options to help users select an appropriate theme.
 * The last option allows users to input a custom theme.
 */
const themeOptions = [
  '浪漫海灘',    // Romantic Beach
  '典雅教堂',    // Elegant Church
  '復古風格',    // Vintage Style
  '現代簡約',    // Modern Minimalist
  '鄉村花園',    // Country Garden
  '奢華宮廷',    // Luxury Palace
  '戶外草坪',    // Outdoor Lawn
  '森林仙境',    // Forest Wonderland
  '自定義'       // Custom
];

/**
 * CoupleInfoPage Component
 * 
 * Collects and validates wedding couple information using Formik forms.
 * Submits data to the backend API and updates the global state.
 * 
 * @returns {JSX.Element} The couple information form page
 */
const CoupleInfoPage: React.FC = () => {
  // Access wedding context for state management and navigation
  const { state, dispatch, nextStep } = useWedding();
  
  // Local state for form submission errors
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  /**
   * Form submission handler
   * 
   * Saves couple information to both the backend API and global state
   * Then advances to the next step in the workflow
   * 
   * @param {CoupleInfo} values - Form values from Formik
   * @param {Object} formikHelpers - Formik helper methods
   */
  const handleSubmit = async (values: CoupleInfo, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    try {
      // Clear any previous errors
      setSubmitError(null);
      
      // Set loading state
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Save couple data to backend
      await api.couple.save(values);
      
      // Update global state with couple information
      dispatch({ type: 'SET_COUPLE_INFO', payload: values });
      
      // Proceed to next step in the workflow
      nextStep();
    } catch (error) {
      console.error('Error saving couple information:', error);
      setSubmitError('無法保存資料，請稍後再試。');
    } finally {
      // Clear form submission state
      setSubmitting(false);
      dispatch({ type: 'SET_LOADING', payload: false });
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
  
  return (
    <motion.div 
      className="min-h-screen py-12 px-4 max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <h1 className="text-3xl font-serif text-center font-bold mb-8 text-wedding-dark">新人基本資料</h1>
      
      {/* Progress bar showing current step */}
      <ProgressIndicator />
      
      <div className="card bg-white shadow-md rounded-xl p-6 md:p-8">
        <p className="text-sm text-wedding-dark mb-6">請完整填寫以下資料，以便生成專屬邀請函</p>
        
        {/* Error message display */}
        {submitError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {submitError}
          </div>
        )}
        
        {/* 
          Formik Form
          
          Formik handles form state, validation, and submission:
          - initialValues: Pre-fills the form with existing data if available
          - validationSchema: Uses Yup schema for field validation
          - onSubmit: Calls our submission handler function
        */}
        <Formik
          initialValues={state.coupleInfo}
          validationSchema={CoupleInfoSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, isValid, dirty }) => (
            <Form className="space-y-6">
              {/* Grid layout for name fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Groom name field */}
                <div>
                  <label htmlFor="groomName" className="label">新郎姓名 *</label>
                  <Field name="groomName" type="text" className="input-field" />
                  <ErrorMessage name="groomName" component="div" className="text-red-500 text-xs mt-1" />
                </div>
                
                {/* Bride name field */}
                <div>
                  <label htmlFor="brideName" className="label">新娘姓名 *</label>
                  <Field name="brideName" type="text" className="input-field" />
                  <ErrorMessage name="brideName" component="div" className="text-red-500 text-xs mt-1" />
                </div>
              </div>
              
              {/* Grid layout for date and time fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Wedding date field */}
                <div>
                  <label htmlFor="weddingDate" className="label">婚禮日期 *</label>
                  <Field name="weddingDate" type="date" className="input-field" />
                  <ErrorMessage name="weddingDate" component="div" className="text-red-500 text-xs mt-1" />
                </div>
                
                {/* Wedding time field */}
                <div>
                  <label htmlFor="weddingTime" className="label">婚禮時間 *</label>
                  <Field name="weddingTime" type="time" className="input-field" />
                  <ErrorMessage name="weddingTime" component="div" className="text-red-500 text-xs mt-1" />
                </div>
              </div>
              
              {/* Wedding location field */}
              <div>
                <label htmlFor="weddingLocation" className="label">婚禮地點 *</label>
                <Field name="weddingLocation" type="text" className="input-field" />
                <ErrorMessage name="weddingLocation" component="div" className="text-red-500 text-xs mt-1" />
              </div>
              
              {/* Wedding theme dropdown field */}
              <div>
                <label htmlFor="weddingTheme" className="label">婚禮主題 *</label>
                <Field name="weddingTheme" as="select" className="input-field">
                  <option value="">請選擇主題</option>
                  {themeOptions.map((theme) => (
                    <option key={theme} value={theme}>{theme}</option>
                  ))}
                </Field>
                <ErrorMessage name="weddingTheme" component="div" className="text-red-500 text-xs mt-1" />
              </div>
              
              {/* Background story field (optional) */}
              <div>
                <label htmlFor="backgroundStory" className="label">婚禮背景故事 (選填)</label>
                <Field 
                  name="backgroundStory" 
                  as="textarea" 
                  rows={5} 
                  placeholder="請描述您們的相識、相戀故事，這將幫助我們為您的賓客創建更有個性的邀請函..."
                  className="input-field resize-none"
                />
              </div>
              
              {/* Form submission button */}
              <div className="flex justify-end mt-8">
                <button
                  type="submit"
                  disabled={isSubmitting || !(isValid && dirty)}
                  className={`btn-primary ${!(isValid && dirty) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? '處理中...' : '下一步'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </motion.div>
  );
};

export default CoupleInfoPage; 