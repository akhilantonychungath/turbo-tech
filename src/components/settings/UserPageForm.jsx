import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import Layout from '../common/Layout';
import CustomSelect from '../common/CustomSelect';
import LoadingSpinner from '../ui/LoadingSpinner';

const UserPageForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    pageName: '',
    pageUrl: '',
    description: '',
    parentId: ''
  });

  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      fetchUserPage();
    }
  }, [id, isEditMode]);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        setPagesLoading(true);
        const snaps = await getDocs(collection(db, 'userPages'));
        const all = snaps.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
        setPages(all);
      } catch (err) {
        console.error('Error fetching pages list:', err);
      } finally {
        setPagesLoading(false);
      }
    };

    fetchPages();
  }, []);

  const fetchUserPage = async () => {
    try {
      setFetching(true);
      setError('');
      const pageDocRef = doc(db, 'userPages', id);
      const pageDoc = await getDoc(pageDocRef);

      if (pageDoc.exists()) {
        const pageData = pageDoc.data();
        setFormData({
          pageName: pageData.pageName || '',
          pageUrl: pageData.pageUrl || '',
          description: pageData.description || '',
          parentId: pageData.parentId || ''
        });
      } else {
        setError('User page not found');
      }
    } catch (err) {
      console.error('Error fetching user page:', err);
      setError('Failed to load user page data. Please try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.pageName.trim()) {
      setError('Page name is required');
      return;
    }

    if (!formData.pageUrl.trim()) {
      setError('Page URL is required');
      return;
    }

    // Validate URL format
    try {
      // Check if it's a valid URL or a valid path
      if (!formData.pageUrl.startsWith('/') && !formData.pageUrl.match(/^https?:\/\//)) {
        setError('Page URL must start with "/" or be a valid URL (http:// or https://)');
        return;
      }
    } catch (err) {
      setError('Invalid URL format');
      return;
    }

    try {
      setLoading(true);
      // Build ancestors array based on selected parent
      let ancestors = [];
      if (formData.parentId) {
        const parentRef = doc(db, 'userPages', formData.parentId);
        const parentSnap = await getDoc(parentRef);
        const parentData = parentSnap.exists() ? parentSnap.data() : {};
        const parentAncestors = parentData.ancestors || [];
        ancestors = [formData.parentId, ...parentAncestors];
      }

      if (isEditMode) {
        // Update existing user page - preserve createdAt
        const pageDocRef = doc(db, 'userPages', id);
        const pageDoc = await getDoc(pageDocRef);
        const existingData = pageDoc.exists() ? pageDoc.data() : {};

        await setDoc(pageDocRef, {
          pageName: formData.pageName.trim(),
          pageUrl: formData.pageUrl.trim(),
          description: formData.description.trim(),
          parentId: formData.parentId || null,
          ancestors,
          createdAt: existingData.createdAt || new Date(),
          updatedAt: new Date()
        }, { merge: true });
      } else {
        // Create new user page
        await addDoc(collection(db, 'userPages'), {
          pageName: formData.pageName.trim(),
          pageUrl: formData.pageUrl.trim(),
          description: formData.description.trim(),
          parentId: formData.parentId || null,
          ancestors,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/user-pages');
      }, 2000);
    } catch (err) {
      console.error('Error saving user page:', err);
      setError(`Failed to save user page: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/user-pages');
  };

  if (fetching) {
    return (
      <Layout title={isEditMode ? "Edit User Page" : "Add User Page"}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner message="Loading..." />
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout title={isEditMode ? "Edit User Page" : "Add User Page"}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined w-8 h-8 text-green-600 text-[32px]">check</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isEditMode ? 'User Page Updated!' : 'User Page Created!'}
              </h3>
              <p className="text-gray-600">
                {isEditMode
                  ? 'User page information has been updated successfully.'
                  : 'User page has been created successfully.'}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isEditMode ? "Edit User Page" : "Add User Page"}>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">description</span>
                </div>
                <h2 className="text-2xl font-bold">{isEditMode ? 'Edit User Page' : 'Add User Page'}</h2>
              </div>
              <button
                onClick={() => navigate('/user-pages')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
                Back to User Pages
              </button>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-xl">
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Page Name Input */}
              <div className="md:col-span-2">
                <label htmlFor="pageName" className="block text-sm font-medium text-gray-700 mb-2">
                  Page Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="pageName"
                  name="pageName"
                  type="text"
                  value={formData.pageName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter page name"
                  required
                />
              </div>

              {/* Parent Page Dropdown */}
              <div className="md:col-span-2">
                <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Page
                </label>
                {pagesLoading ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 text-sm">
                    Loading pages...
                  </div>
                ) : (
                  <CustomSelect
                    name="parentId"
                    value={formData.parentId}
                    onChange={handleChange}
                    placeholder="No parent"
                    options={[
                      { value: '', label: 'No parent' },
                      ...(pages || [])
                        .filter(p => p.id !== id && !(isEditMode && (p.ancestors || []).includes(id)))
                        .map(p => ({
                          value: p.id,
                          label: p.pageName || p.pageUrl || p.id
                        }))
                    ]}
                    showRoleChip={false}
                  />
                )}
              </div>

              {/* Page URL Input */}
              <div className="md:col-span-2">
                <label htmlFor="pageUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Page URL <span className="text-red-500">*</span>
                </label>
                <input
                  id="pageUrl"
                  name="pageUrl"
                  type="text"
                  value={formData.pageUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="/profile"
                  required
                />
              </div>

              {/* Description Input */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Enter page description"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex gap-4 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update User Page' : 'Create User Page'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default UserPageForm;

