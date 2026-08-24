import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import Layout from '../common/Layout';
import CustomSelect from '../common/CustomSelect';
import DealerCard from './DealerCard';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { createUserMap, sortDealers, filterDealers } from '../../utils/dealerUtils';
import { SORT_OPTIONS } from '../../constants/dealerConstants';

const DealersList = () => {
  const formAccessID =  '/dealers';
  const navigate = useNavigate();
  const [dealers, setDealers] = useState([]);
  const [filteredDealers, setFilteredDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name-asc, name-desc

  // Fetch all users to map transactionIds to names
  const { items: allUsers } = useFirestoreCollection('users', {
    autoFetch: true
  });

  // Create a map of transactionId to user data for quick lookup
  const userMap = useMemo(() => createUserMap(allUsers), [allUsers]);

  useEffect(() => {
    fetchDealers();
  }, []);

  const fetchDealers = async () => {
    try {
      setLoading(true);
      setError('');
      const dealersRef = collection(db, 'dealers');
      const q = query(dealersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const dealersData = [];
      querySnapshot.forEach((doc) => {
        dealersData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setDealers(dealersData);
      setFilteredDealers(dealersData);
    } catch (err) {
      console.error('Error fetching dealers:', err);
      setError('Failed to load dealers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = filterDealers(dealers, searchQuery, userMap);
    const sorted = sortDealers(filtered, sortBy, userMap);
    setFilteredDealers(sorted);
  }, [searchQuery, dealers, sortBy, userMap]);

  const handleDealerUpdate = () => {
    fetchDealers();
  };

  return (
    <Layout title="Dealers List">
      <div className="container mx-auto px-4 py-8 flex flex-col">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">store</span>
                </div>
                <h2 className="text-2xl font-bold">Dealers</h2>
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
                    placeholder="Search dealers by name, location, or district..."
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
                      options={SORT_OPTIONS}
                      showRoleChip={false}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/dealers/add')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add Dealer
              </button>
            </div>
            {searchQuery && (
              <p className="mt-4 text-sm text-white/90">
                Found {filteredDealers.length} {filteredDealers.length === 1 ? 'dealer' : 'dealers'} matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Dealers List */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-1 min-h-[calc(100vh-300px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-gray-600">Loading dealers...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : filteredDealers.length === 0 && searchQuery ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Dealers Found</h3>
              <p className="text-gray-600 mb-4">No dealers match your search "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear search
              </button>
            </div>
          ) : dealers.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined w-16 h-16 text-gray-400 mx-auto mb-4 block text-[64px]">store</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Dealers Found</h3>
              <p className="text-gray-600 mb-4">Get started by registering your first dealer.</p>
              <button
                onClick={() => navigate('/dealers/add')}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-2 shadow-md hover:shadow-lg transition-all duration-200 font-semibold inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add Dealer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDealers.map((dealer) => (
                <DealerCard
                  key={dealer.id}
                  dealer={dealer}
                  userMap={userMap}
                  onUpdate={handleDealerUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DealersList;

