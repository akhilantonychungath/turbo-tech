import React from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDealerDate, getDealerDisplayName, getDealerPhone, getDealerWhatsApp } from '../../utils/dealerUtils';

const DealerCard = ({ dealer, userMap, onUpdate }) => {
  const navigate = useNavigate();

  const handleApprove = async (e) => {
    e.stopPropagation();
    try {
      const dealerRef = doc(db, 'dealers', dealer.id);
      await updateDoc(dealerRef, {
        status: 'approved',
        updatedAt: new Date()
      });
      onUpdate?.();
    } catch (err) {
      console.error('Error approving dealer:', err);
    }
  };

  const handleBlock = async (e) => {
    e.stopPropagation();
    try {
      const dealerRef = doc(db, 'dealers', dealer.id);
      await updateDoc(dealerRef, {
        status: 'blocked',
        updatedAt: new Date()
      });
      onUpdate?.();
    } catch (err) {
      console.error('Error blocking dealer:', err);
    }
  };

  const dealerName = getDealerDisplayName(dealer, userMap);
  const phoneNumber = getDealerPhone(dealer, userMap);
  const whatsappNumber = getDealerWhatsApp(dealer, userMap);

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
              <span className="material-symbols-outlined w-6 h-6 text-white">store</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{dealerName}</h3>
              {dealer.type && (
                <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 mr-2">
                  {dealer.type === 'showroom' ? 'Showroom' : 'Home Sales'}
                </span>
              )}
              {dealer.status && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  dealer.status === 'approved' 
                    ? 'bg-green-100 text-green-800' 
                    : dealer.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {dealer.status.charAt(0).toUpperCase() + dealer.status.slice(1)}
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {(dealer.dealerNameTransactionId || dealer.dealerName) && (
              <div>
                <span className="text-gray-600 font-medium">Dealer Name:</span>
                <p className="text-gray-900">{dealerName}</p>
              </div>
            )}
            {dealer.showroomName && (
              <div>
                <span className="text-gray-600 font-medium">Showroom Name:</span>
                <p className="text-gray-900">{dealer.showroomName}</p>
              </div>
            )}
            <div>
              <span className="text-gray-600 font-medium">District:</span>
              <p className="text-gray-900">{dealer.district || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Location:</span>
              <p className="text-gray-900">{dealer.location || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Phone:</span>
              <p className="text-gray-900">{phoneNumber}</p>
            </div>
            <div>
              <span className="text-gray-600 font-medium">WhatsApp:</span>
              <p className="text-gray-900">{whatsappNumber}</p>
            </div>
            {dealer.gstNumber && (
              <div>
                <span className="text-gray-600 font-medium">GST Number:</span>
                <p className="text-gray-900">{dealer.gstNumber}</p>
              </div>
            )}
            {dealer.panNumber && (
              <div>
                <span className="text-gray-600 font-medium">PAN Number:</span>
                <p className="text-gray-900">{dealer.panNumber}</p>
              </div>
            )}
            {dealer.accessMode && (
              <div>
                <span className="text-gray-600 font-medium">Access Mode:</span>
                <p className="text-gray-900 capitalize">{dealer.accessMode}</p>
              </div>
            )}
            <div>
              <span className="text-gray-600 font-medium">Created At:</span>
              <p className="text-gray-900">{formatDealerDate(dealer.createdAt)}</p>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Last Updated:</span>
              <p className="text-gray-900">{formatDealerDate(dealer.updatedAt)}</p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate(`/dealers/edit/${dealer.id}`)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">edit</span>
            <span>Edit</span>
          </button>
          <button
            onClick={handleApprove}
            disabled={dealer.status === 'approved'}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              dealer.status === 'approved'
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {dealer.status === 'blocked' ? 'Unblock' : 'Approve'}
          </button>
          <button
            onClick={handleBlock}
            disabled={dealer.status === 'blocked'}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              dealer.status === 'blocked'
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
            }`}
          >
            Block
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealerCard;

