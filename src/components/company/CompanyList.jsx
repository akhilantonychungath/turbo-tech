import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Layout from '../common/Layout';
import CustomSelect from '../common/CustomSelect';

const CompanyList = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name-asc, name-desc

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError('');
      const companiesRef = collection(db, 'companies');
      const q = query(companiesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const companiesData = [];
      querySnapshot.forEach((doc) => {
        companiesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setCompanies(companiesData);
      setFilteredCompanies(companiesData);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to load companies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = companies;
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = companies.filter(company =>
        company.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        case 'oldest':
          const dateAOld = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateBOld = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateAOld - dateBOld;
        case 'name-asc':
          return (a.companyName || '').localeCompare(b.companyName || '');
        case 'name-desc':
          return (b.companyName || '').localeCompare(a.companyName || '');
        default:
          return 0;
      }
    });
    
    setFilteredCompanies(sorted);
  }, [searchQuery, companies, sortBy]);

  const handleApprove = async (companyId) => {
    try {
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        status: 'approved',
        isBlocked: false,
        updatedAt: new Date()
      });
      // Refresh the list
      fetchCompanies();
    } catch (err) {
      console.error('Error approving company:', err);
      setError('Failed to approve company. Please try again.');
    }
  };

  const handleBlock = async (companyId) => {
    try {
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        status: 'blocked',
        isBlocked: true,
        updatedAt: new Date()
      });
      // Refresh the list
      fetchCompanies();
    } catch (err) {
      console.error('Error blocking company:', err);
      setError('Failed to block company. Please try again.');
    }
  };

  return (
    <Layout title="Company List">
      <div className="container mx-auto px-4 py-8 flex flex-col">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">business</span>
                </div>
                <h2 className="text-2xl font-bold">Companies</h2>
              </div>
              
              {/* Search Bar and Sort */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1 lg:mx-6 w-full">
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white outline-none"
                    placeholder="Search companies by name..."
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Sort Option */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                  <label className="text-sm font-medium text-white whitespace-nowrap">Sort by:</label>
                  <div className="flex-1 sm:flex-initial min-w-[180px]">
                    <CustomSelect
                      name="sortBy"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      placeholder="Select sort option"
                      options={[
                        { value: 'newest', label: 'Newest First' },
                        { value: 'oldest', label: 'Oldest First' },
                        { value: 'name-asc', label: 'Name (A-Z)' },
                        { value: 'name-desc', label: 'Name (Z-A)' }
                      ]}
                      showRoleChip={false}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/company-registration')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add Company
              </button>
            </div>
            {searchQuery && (
              <p className="mt-4 text-sm text-white/90">
                Found {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'} matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Companies List */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-1 min-h-[calc(100vh-300px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-gray-600">Loading companies...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : filteredCompanies.length === 0 && searchQuery ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Companies Found</h3>
              <p className="text-gray-600 mb-4">No companies match your search "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear search
              </button>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Companies Found</h3>
              <p className="text-gray-600 mb-4">Get started by registering your first company.</p>
              <button
                onClick={() => navigate('/company-registration')}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-2 shadow-md hover:shadow-lg transition-all duration-200 font-semibold inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add Company
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
                          <span className="material-symbols-outlined w-6 h-6 text-white">business</span>
                        </div>
                        <div>
                        <h3 className="text-xl font-bold text-gray-900">{company.companyName}</h3>
                        {company.status && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            company.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : company.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                          </span>
                        )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 font-medium">Registration Number:</span>
                          <p className="text-gray-900">{company.registrationNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Email:</span>
                          <p className="text-gray-900">{company.email || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Phone:</span>
                          <p className="text-gray-900">{company.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Tax ID:</span>
                          <p className="text-gray-900">{company.taxId || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">City:</span>
                          <p className="text-gray-900">{company.city || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">State:</span>
                          <p className="text-gray-900">{company.state || 'N/A'}</p>
                        </div>
                        {company.industry && (
                          <div>
                            <span className="text-gray-600 font-medium">Industry:</span>
                            <p className="text-gray-900">{company.industry}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => navigate(`/companies/edit/${company.id}`)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleApprove(company.id)}
                        disabled={company.status === 'approved' && !company.isBlocked}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          company.status === 'approved' && !company.isBlocked
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        {company.status === 'blocked' || company.isBlocked ? 'Unblock' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleBlock(company.id)}
                        disabled={company.status === 'blocked' || company.isBlocked}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          company.status === 'blocked' || company.isBlocked
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        Block
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CompanyList;

