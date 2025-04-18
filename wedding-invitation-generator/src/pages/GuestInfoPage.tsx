import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import ProgressIndicator from '../components/ProgressIndicator';
import { useWedding } from '../context/WeddingContext';
import { GuestInfo, RelationshipType } from '../types';
import api from '../services/api';

// 賓客資料表單驗證規則
const GuestInfoSchema = Yup.object().shape({
  name: Yup.string().required('請輸入賓客姓名'),
  relationship: Yup.string().required('請選擇與賓客的關係'),
  email: Yup.string().email('請輸入有效的電子郵件地址').required('請輸入電子郵件地址'),
  preferences: Yup.string(),
  howMet: Yup.string(),
  memories: Yup.string()
});

// 關係選項
const relationshipOptions: RelationshipType[] = [
  '親戚',
  '朋友',
  '同事',
  '家人',
  '學校同學',
  '其他'
];

// 賓客資料輸入頁面組件
// 該頁面提供表單讓用戶手動添加賓客資料，並支持對已添加的賓客進行編輯或刪除
const GuestInfoPage: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWedding();
  const [editingGuest, setEditingGuest] = useState<GuestInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 頁面載入時，嘗試從後端獲取賓客列表
  useEffect(() => {
    const fetchGuests = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await api.guests.getAll();
        if (response.data && response.data.length > 0) {
          // 如果後端已有賓客數據，更新到前端狀態
          response.data.forEach(guest => {
            dispatch({
              type: 'ADD_GUEST',
              payload: guest
            });
          });
        }
      } catch (err) {
        console.error('獲取賓客列表時出錯:', err);
        setError('無法獲取賓客列表，請稍後再試。');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGuests();
  }, [dispatch]);
  
  // 初始賓客資料
  const initialValues: Omit<GuestInfo, 'id'> = {
    name: '',
    relationship: '朋友',
    email: '',
    preferences: '',
    howMet: '',
    memories: '',
    status: 'pending'
  };
  
  // 處理表單提交 - 添加或更新賓客
  const handleSubmit = async (values: Omit<GuestInfo, 'id'>, { resetForm, setSubmitting }: { resetForm: () => void, setSubmitting: (isSubmitting: boolean) => void }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (editingGuest) {
        // 更新現有賓客
        const guestData = { ...values, id: editingGuest.id };
        await api.guests.update(editingGuest.id, guestData);
        
        // 更新前端狀態
        dispatch({
          type: 'UPDATE_GUEST',
          payload: guestData
        });
        setEditingGuest(null);
      } else {
        // 添加新賓客
        const newGuest = { ...values, id: crypto.randomUUID() };
        const response = await api.guests.add(newGuest);
        
        // 使用後端返回的數據更新前端狀態
        dispatch({
          type: 'ADD_GUEST',
          payload: response.data || newGuest
        });
      }
      
      // 重置表單
      resetForm();
    } catch (err) {
      console.error('保存賓客資料時出錯:', err);
      setError('無法保存賓客資料，請稍後再試。');
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };
  
  // 編輯賓客
  const handleEdit = (guest: GuestInfo) => {
    setEditingGuest(guest);
    setError(null);
  };
  
  // 取消編輯
  const handleCancelEdit = () => {
    setEditingGuest(null);
  };
  
  // 刪除賓客
  const handleDelete = async (id: string) => {
    if (window.confirm('確定要刪除此賓客嗎？')) {
      try {
        setIsLoading(true);
        setError(null);
        
        // 呼叫API刪除賓客
        await api.guests.delete(id);
        
        // 更新前端狀態
        dispatch({ type: 'REMOVE_GUEST', payload: id });
      } catch (err) {
        console.error('刪除賓客時出錯:', err);
        setError('無法刪除賓客，請稍後再試。');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // 下一步（只有當至少添加了一個賓客時才能繼續）
  const handleNext = () => {
    if (state.guests.length > 0) {
      nextStep();
    } else {
      alert('請至少添加一位賓客');
    }
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
  
  // 卡片動畫
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
      
      {/* 進度指示器 */}
      <ProgressIndicator />
      
      {/* 錯誤訊息顯示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* 加載指示器 */}
      {isLoading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 flex items-center">
          <svg className="animate-spin h-5 w-5 mr-3 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          處理中...
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 表單部分 */}
        <div className="md:col-span-2">
          <div className="card">
            <h2 className="text-xl font-medium mb-4 text-wedding-dark">
              {editingGuest ? '編輯賓客資料' : '新增賓客'}
            </h2>
            
            <Formik
              initialValues={editingGuest || initialValues}
              validationSchema={GuestInfoSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, isValid, dirty }) => (
                <Form className="space-y-4">
                  {/* 賓客姓名 */}
                  <div>
                    <label htmlFor="name" className="label">賓客姓名 *</label>
                    <Field name="name" type="text" className="input-field" />
                    <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1" />
                  </div>
                  
                  {/* 與新人關係 */}
                  <div>
                    <label htmlFor="relationship" className="label">與新人關係 *</label>
                    <Field name="relationship" as="select" className="input-field">
                      {relationshipOptions.map((relation) => (
                        <option key={relation} value={relation}>{relation}</option>
                      ))}
                    </Field>
                    <ErrorMessage name="relationship" component="div" className="text-red-500 text-xs mt-1" />
                  </div>
                  
                  {/* 電子郵件 */}
                  <div>
                    <label htmlFor="email" className="label">電子郵件 *</label>
                    <Field name="email" type="email" className="input-field" />
                    <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1" />
                  </div>
                  
                  {/* 賓客喜好 */}
                  <div>
                    <label htmlFor="preferences" className="label">賓客喜好 (選填)</label>
                    <Field 
                      name="preferences" 
                      type="text" 
                      placeholder="例如：喜歡的食物、飲料或活動"
                      className="input-field" 
                    />
                  </div>
                  
                  {/* 如何認識 */}
                  <div>
                    <label htmlFor="howMet" className="label">如何認識 (選填)</label>
                    <Field 
                      name="howMet" 
                      type="text" 
                      placeholder="例如：大學同學、公司同事"
                      className="input-field" 
                    />
                  </div>
                  
                  {/* 共同回憶 */}
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
                  
                  {/* 按鈕區域 */}
                  <div className="flex justify-end space-x-3 pt-4">
                    {editingGuest && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        取消
                      </button>
                    )}
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
        
        {/* 賓客列表 */}
        <div className="md:col-span-1">
          <div className="card h-full overflow-auto">
            <h2 className="text-xl font-medium mb-4 text-wedding-dark">已加入賓客</h2>
            
            {state.guests.length === 0 ? (
              <p className="text-gray-500 text-sm">尚未新增賓客</p>
            ) : (
              <ul className="space-y-3">
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
                      <div>
                        <h3 className="font-medium">{guest.name}</h3>
                        <p className="text-xs text-gray-500">{guest.relationship} | {guest.email}</p>
                      </div>
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
      
      {/* 導航按鈕 */}
      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          className="px-6 py-2 border border-wedding-dark text-wedding-dark rounded-lg hover:bg-wedding-dark hover:text-white transition-colors"
        >
          上一步
        </button>
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