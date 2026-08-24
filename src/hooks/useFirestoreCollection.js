import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook for managing Firestore collections
 * @param {string} collectionName - Name of the Firestore collection
 * @param {Object} options - Configuration options
 * @returns {Object} Collection data and CRUD operations
 */
export const useFirestoreCollection = (collectionName, options = {}) => {
  const {
    orderByField = 'createdAt',
    orderDirection = 'desc',
    autoFetch = true
  } = options;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, orderBy(orderByField, orderDirection));
      const querySnapshot = await getDocs(q);
      
      const itemsData = [];
      querySnapshot.forEach((docSnapshot) => {
        itemsData.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      });
      
      setItems(itemsData);
      return itemsData;
    } catch (err) {
      console.error(`Error fetching ${collectionName}:`, err);
      setError(`Failed to load ${collectionName}. Please try again.`);
      return [];
    } finally {
      setLoading(false);
    }
  }, [collectionName, orderByField, orderDirection]);

  const fetchItem = useCallback(async (itemId) => {
    try {
      setError('');
      const itemRef = doc(db, collectionName, itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (itemDoc.exists()) {
        return {
          id: itemDoc.id,
          ...itemDoc.data()
        };
      }
      return null;
    } catch (err) {
      console.error(`Error fetching ${collectionName} item:`, err);
      setError(`Failed to load item. Please try again.`);
      return null;
    }
  }, [collectionName]);

  const createItem = useCallback(async (data) => {
    try {
      setError('');
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (err) {
      console.error(`Error creating ${collectionName} item:`, err);
      setError(`Failed to create item. Please try again.`);
      throw err;
    }
  }, [collectionName]);

  const updateItem = useCallback(async (itemId, data) => {
    try {
      setError('');
      const itemRef = doc(db, collectionName, itemId);
      await updateDoc(itemRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error(`Error updating ${collectionName} item:`, err);
      setError(`Failed to update item. Please try again.`);
      throw err;
    }
  }, [collectionName]);

  const deleteItem = useCallback(async (itemId) => {
    try {
      setError('');
      const itemRef = doc(db, collectionName, itemId);
      await deleteDoc(itemRef);
    } catch (err) {
      console.error(`Error deleting ${collectionName} item:`, err);
      setError(`Failed to delete item. Please try again.`);
      throw err;
    }
  }, [collectionName]);

  useEffect(() => {
    if (autoFetch) {
      fetchItems();
    }
  }, [autoFetch, fetchItems]);

  return {
    items,
    loading,
    error,
    setError,
    fetchItems,
    fetchItem,
    createItem,
    updateItem,
    deleteItem
  };
};

