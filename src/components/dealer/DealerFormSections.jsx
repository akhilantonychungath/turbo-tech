import React from 'react';
import CustomSelect from '../common/CustomSelect';
import FileUpload from './FileUpload';
import UserCheckboxList from './UserCheckboxList';
import { 
  DEALER_TYPES, 
  KERALA_DISTRICTS, 
  ACCESS_MODES, 
  POTENTIAL_LEVELS,
  FILE_ACCEPT_TYPES 
} from '../../constants/dealerConstants';

/**
 * Basic Information Section
 */
export const BasicInfoSection = ({ formData, handleChange, dealerUsers, dealerUsersLoading }) => (
  <>
    <div className="md:col-span-2">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Basic Information
      </h3>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Type <span className="text-red-500">*</span>
      </label>
      <CustomSelect
        name="type"
        value={formData.type}
        onChange={handleChange}
        required
        placeholder="Select Type"
        options={DEALER_TYPES}
        showRoleChip={false}
      />
    </div>

    {formData.type === 'showroom' && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name of Showroom <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="showroomName"
          value={formData.showroomName}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter showroom name"
        />
      </div>
    )}

    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Dealer/Business Name <span className="text-red-500">*</span>
      </label>
      {dealerUsersLoading ? (
        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
          Loading dealers...
        </div>
      ) : (
        <CustomSelect
          name="dealerName"
          value={formData.dealerName}
          onChange={handleChange}
          required
          disabled={dealerUsersLoading}
          placeholder="Select Dealer/Business Name"
          options={dealerUsers.map((user) => ({
            value: user.transactionId || user.id,
            label: user.name || user.email || 'Unknown User',
            roleName: ''
          }))}
          showRoleChip={false}
        />
      )}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        District <span className="text-red-500">*</span>
      </label>
      <CustomSelect
        name="district"
        value={formData.district}
        onChange={handleChange}
        required
        placeholder="Select District"
        options={KERALA_DISTRICTS}
        showRoleChip={false}
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Location
      </label>
      <input
        type="text"
        name="location"
        value={formData.location}
        onChange={handleChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Enter location"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        GST Number
      </label>
      <input
        type="text"
        name="gstNumber"
        value={formData.gstNumber}
        onChange={handleChange}
        maxLength="15"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
        placeholder="29ABCDE1234F1Z5"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        PAN Number
      </label>
      <input
        type="text"
        name="panNumber"
        value={formData.panNumber}
        onChange={handleChange}
        maxLength="10"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
        placeholder="ABCDE1234F"
      />
    </div>
  </>
);

/**
 * Marketing Information Section
 */
export const MarketingInfoSection = ({ 
  marketingInfo, 
  services, 
  handleMarketingInfoChange, 
  handleAddServices, 
  handleRemoveServices 
}) => (
  <>
    <div className="md:col-span-2 mt-4">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Marketing Information</h3>
        <button
          type="button"
          onClick={handleAddServices}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-base leading-none inline-flex items-center">add</span>
          <span>Add Services</span>
        </button>
      </div>
    </div>

    {marketingInfo.map((info, index) => (
      <div key={index} className="md:col-span-2">
        <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={info.services}
                onChange={(e) => handleMarketingInfoChange(index, 'services', e.target.value)}
                required
                placeholder="Select Services"
                name={`services-${index}`}
                options={services.map((service) => ({
                  value: service.id,
                  label: service.serviceName
                }))}
                showRoleChip={false}
              />
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Potential <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={info.potential}
                  onChange={(e) => handleMarketingInfoChange(index, 'potential', e.target.value)}
                  required
                  placeholder="Select Potential"
                  name={`potential-${index}`}
                  options={POTENTIAL_LEVELS}
                  showRoleChip={false}
                />
              </div>
              {marketingInfo.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveServices(index)}
                  className="h-10 w-10 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                  title="Remove this row"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    ))}
  </>
);

/**
 * Ownership Section
 */
export const OwnershipSection = ({ 
  formData, 
  handleChange, 
  handleServingByChange, 
  insideUsers, 
  insideUsersLoading 
}) => (
  <>
    <div className="md:col-span-2 mt-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Ownership
      </h3>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Opened By <span className="text-red-500">*</span>
      </label>
      {insideUsersLoading ? (
        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
          Loading users...
        </div>
      ) : (
        <CustomSelect
          name="openedBy"
          value={formData.openedBy}
          onChange={handleChange}
          required
          disabled={insideUsersLoading}
          placeholder="Select Opened By"
          options={insideUsers.map((user) => ({
            value: user.transactionId || user.id,
            label: user.name || user.email || 'Unknown User',
            roleName: user.roleName || ''
          }))}
          showRoleChip={true}
        />
      )}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Owner By <span className="text-red-500">*</span>
      </label>
      {insideUsersLoading ? (
        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
          Loading users...
        </div>
      ) : (
        <CustomSelect
          name="ownerBy"
          value={formData.ownerBy}
          onChange={handleChange}
          required
          disabled={insideUsersLoading}
          placeholder="Select Owner By"
          options={insideUsers.map((user) => ({
            value: user.transactionId || user.id,
            label: user.name || user.email || 'Unknown User',
            roleName: user.roleName || ''
          }))}
          showRoleChip={true}
        />
      )}
    </div>

    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Serving By <span className="text-red-500">*</span>
      </label>
      <UserCheckboxList
        users={insideUsers}
        selectedIds={formData.servingBy}
        onToggle={handleServingByChange}
        loading={insideUsersLoading}
        showRoleChip={true}
      />
      {(!formData.servingBy || (Array.isArray(formData.servingBy) && formData.servingBy.length === 0)) && (
        <p className="text-xs text-red-500 mt-1">Please select at least one user</p>
      )}
    </div>
  </>
);

/**
 * Access Section
 */
export const AccessSection = ({ formData, handleChange }) => (
  <>
    <div className="md:col-span-2 mt-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Access
      </h3>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Access Mode <span className="text-red-500">*</span>
      </label>
      <CustomSelect
        name="accessMode"
        value={formData.accessMode}
        onChange={handleChange}
        required
        placeholder="Select Access Mode"
        options={ACCESS_MODES}
        showRoleChip={false}
      />
    </div>
  </>
);

/**
 * Bank Details Section
 */
export const BankDetailsSection = ({ 
  bankDetails, 
  handleBankDetailsChange, 
  handleAddBankDetails, 
  handleRemoveBankDetails 
}) => (
  <>
    <div className="md:col-span-2 mt-4">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
        <button
          type="button"
          onClick={handleAddBankDetails}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-base leading-none inline-flex items-center">add</span>
          <span>Add Bank Details</span>
        </button>
      </div>
    </div>

    {bankDetails.map((bank, index) => (
      <div key={index} className="md:col-span-2">
        <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                value={bank.bankName}
                onChange={(e) => handleBankDetailsChange(index, 'bankName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="Enter bank name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name
              </label>
              <input
                type="text"
                value={bank.branchName}
                onChange={(e) => handleBankDetailsChange(index, 'branchName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="Enter branch name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bank.accountHolderName}
                onChange={(e) => handleBankDetailsChange(index, 'accountHolderName', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="Enter account holder name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bank.accountNumber}
                onChange={(e) => handleBankDetailsChange(index, 'accountNumber', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="Enter account number"
              />
            </div>

            <div className="md:col-span-2 flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bank.ifscCode}
                  onChange={(e) => handleBankDetailsChange(index, 'ifscCode', e.target.value.toUpperCase())}
                  required
                  maxLength="11"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white uppercase"
                  placeholder="ABCD0123456"
                />
              </div>
              {bankDetails.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveBankDetails(index)}
                  className="h-10 w-10 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                  title="Remove this row"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    ))}
  </>
);

/**
 * Partnership Section
 */
export const PartnershipSection = ({ 
  formData, 
  handleStaffPartnerChange, 
  dealerStaffUsers, 
  dealerStaffLoading 
}) => (
  <>
    <div className="md:col-span-2 mt-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Partnership
      </h3>
    </div>

    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Staff/Partner
      </label>
      <UserCheckboxList
        users={dealerStaffUsers}
        selectedIds={formData.staffPartner}
        onToggle={handleStaffPartnerChange}
        loading={dealerStaffLoading}
        showRoleChip={false}
      />
    </div>
  </>
);

/**
 * Document Upload Section
 */
export const DocumentUploadSection = ({ 
  formData, 
  handleFileChange, 
  handleRemoveFile, 
  isEditMode = false 
}) => {
  // In edit mode, formData contains URLs (strings), in registration mode it contains File objects
  // The FileUpload component will handle displaying both appropriately
  return (
    <>
      <div className="md:col-span-2 mt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Document Upload
        </h3>
        {isEditMode && (
          <p className="text-sm text-gray-600 mb-4">
            Upload new files to replace existing ones, or leave blank to keep current files.
          </p>
        )}
      </div>

      <FileUpload
        name="adharCard"
        label="Adhar Card"
        value={formData.adharCard}
        onChange={handleFileChange}
        onRemove={handleRemoveFile ? () => handleRemoveFile('adharCard') : undefined}
        accept={FILE_ACCEPT_TYPES}
      />

      <FileUpload
        name="pancard"
        label="Pancard"
        value={formData.pancard}
        onChange={handleFileChange}
        onRemove={handleRemoveFile ? () => handleRemoveFile('pancard') : undefined}
        accept={FILE_ACCEPT_TYPES}
      />

      <FileUpload
        name="license"
        label="License"
        value={formData.license}
        onChange={handleFileChange}
        onRemove={handleRemoveFile ? () => handleRemoveFile('license') : undefined}
        accept={FILE_ACCEPT_TYPES}
      />

      <FileUpload
        name="agreement"
        label="Agreement"
        value={formData.agreement}
        onChange={handleFileChange}
        onRemove={handleRemoveFile ? () => handleRemoveFile('agreement') : undefined}
        accept={FILE_ACCEPT_TYPES}
      />
    </>
  );
};

