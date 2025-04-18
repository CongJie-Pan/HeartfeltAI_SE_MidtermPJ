import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { CoupleInfo } from '../types';

// 定義表單驗證規則
const CoupleInfoSchema = Yup.object().shape({
  groomName: Yup.string().required('請輸入新郎姓名'),
  brideName: Yup.string().required('請輸入新娘姓名'),
  weddingDate: Yup.date().required('請選擇婚禮日期').nullable(),
  weddingTime: Yup.string().required('請選擇婚禮時間'),
  weddingLocation: Yup.string().required('請輸入婚禮地點'),
  weddingTheme: Yup.string().required('請選擇或輸入婚禮主題'),
  backgroundStory: Yup.string()
});

// 常見的婚禮主題選項
const themeOptions = [
  '浪漫海灘',
  '典雅教堂',
  '復古風格',
  '現代簡約',
  '鄉村花園',
  '奢華宮廷',
  '戶外草坪',
  '森林仙境',
  '自定義'
];

// 新人資料輸入頁面組件
// 該頁面讓新人輸入基本資料，作為生成邀請函的基礎
const CoupleInfoPage: React.FC = () => {
  const { state, dispatch, nextStep } = useWedding();
  
  // 處理表單提交
  const handleSubmit = (values: CoupleInfo) => {
    // 儲存新人資料到全局狀態
    dispatch({ type: 'SET_COUPLE_INFO', payload: values });
    // 前進到下一步
    nextStep();
  };
  
  // 動畫配置
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
      
      {/* 進度指示器 */}
      <ProgressIndicator />
      
      <div className="card bg-white shadow-md rounded-xl p-6 md:p-8">
        <p className="text-sm text-wedding-dark mb-6">請完整填寫以下資料，以便生成專屬邀請函</p>
        
        <Formik
          initialValues={state.coupleInfo}
          validationSchema={CoupleInfoSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, isValid, dirty }) => (
            <Form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 新郎姓名 */}
                <div>
                  <label htmlFor="groomName" className="label">新郎姓名 *</label>
                  <Field name="groomName" type="text" className="input-field" />
                  <ErrorMessage name="groomName" component="div" className="text-red-500 text-xs mt-1" />
                </div>
                
                {/* 新娘姓名 */}
                <div>
                  <label htmlFor="brideName" className="label">新娘姓名 *</label>
                  <Field name="brideName" type="text" className="input-field" />
                  <ErrorMessage name="brideName" component="div" className="text-red-500 text-xs mt-1" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 婚禮日期 */}
                <div>
                  <label htmlFor="weddingDate" className="label">婚禮日期 *</label>
                  <Field name="weddingDate" type="date" className="input-field" />
                  <ErrorMessage name="weddingDate" component="div" className="text-red-500 text-xs mt-1" />
                </div>
                
                {/* 婚禮時間 */}
                <div>
                  <label htmlFor="weddingTime" className="label">婚禮時間 *</label>
                  <Field name="weddingTime" type="time" className="input-field" />
                  <ErrorMessage name="weddingTime" component="div" className="text-red-500 text-xs mt-1" />
                </div>
              </div>
              
              {/* 婚禮地點 */}
              <div>
                <label htmlFor="weddingLocation" className="label">婚禮地點 *</label>
                <Field name="weddingLocation" type="text" className="input-field" />
                <ErrorMessage name="weddingLocation" component="div" className="text-red-500 text-xs mt-1" />
              </div>
              
              {/* 婚禮主題 */}
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
              
              {/* 婚禮背景故事 */}
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
              
              {/* 表單按鈕 */}
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