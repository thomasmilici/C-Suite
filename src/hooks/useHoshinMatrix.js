import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';

// Helper for generating unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

export const useHoshinMatrix = (missionId) => {
  const [matrixData, setMatrixData] = useState(null);
  const [matrixId, setMatrixId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!missionId) {
      setLoading(false);
      return;
    }

    let unsubscribe;

    const fetchOrCreateMatrix = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'hoshinMatrix'),
          where('missionId', '==', missionId)
        );
        
        const querySnapshot = await getDocs(q);
        
        let mId;
        if (querySnapshot.empty) {
          // Initialize new matrix for this mission
          const newDocRef = doc(collection(db, 'hoshinMatrix'));
          mId = newDocRef.id;
          
          const initialData = {
            id: mId,
            missionId,
            title: 'Hoshin Kanri X-Matrix',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            longTermGoals: [],
            annualObjectives: [],
            tacticalPriorities: [],
            kpis: [],
            correlations: [],
            accountability: []
          };
          
          await setDoc(newDocRef, initialData);
        } else {
          mId = querySnapshot.docs[0].id;
        }

        setMatrixId(mId);

        // Setup real-time listener
        unsubscribe = onSnapshot(doc(db, 'hoshinMatrix', mId), (docSnap) => {
          if (docSnap.exists()) {
            setMatrixData(docSnap.data());
          }
          setLoading(false);
        }, (err) => {
          console.error("Error listening to Hoshin Matrix:", err);
          setError(err);
          setLoading(false);
        });

      } catch (err) {
        console.error("Error fetching or creating Hoshin Matrix:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchOrCreateMatrix();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [missionId]);

  // Generic update helper
  const updateMatrixField = useCallback(async (mId, updates) => {
    if (!mId) return;
    try {
      const docRef = doc(db, 'hoshinMatrix', mId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error updating matrix:", err);
      throw err;
    }
  }, []);

  const addLongTermGoal = useCallback(async (mId, text, horizon = "3 years") => {
    if (!matrixData) return;
    const newItem = { id: generateId(), text, horizon, order: matrixData.longTermGoals.length };
    await updateMatrixField(mId, {
      longTermGoals: [...(matrixData.longTermGoals || []), newItem]
    });
  }, [matrixData, updateMatrixField]);

  const addAnnualObjective = useCallback(async (mId, text, linkedOkrId = null) => {
    if (!matrixData) return;
    const newItem = { id: generateId(), text, linkedOkrId, order: matrixData.annualObjectives.length };
    await updateMatrixField(mId, {
      annualObjectives: [...(matrixData.annualObjectives || []), newItem]
    });
  }, [matrixData, updateMatrixField]);

  const addTacticalPriority = useCallback(async (mId, text) => {
    if (!matrixData) return;
    const newItem = { id: generateId(), text, order: matrixData.tacticalPriorities.length };
    await updateMatrixField(mId, {
      tacticalPriorities: [...(matrixData.tacticalPriorities || []), newItem]
    });
  }, [matrixData, updateMatrixField]);

  const addKpi = useCallback(async (mId, text, unit = '', target = '', linkedTargetMetricId = null) => {
    if (!matrixData) return;
    const newItem = { id: generateId(), text, unit, target, linkedTargetMetricId, order: matrixData.kpis.length };
    await updateMatrixField(mId, {
      kpis: [...(matrixData.kpis || []), newItem]
    });
  }, [matrixData, updateMatrixField]);

  const setCorrelation = useCallback(async (mId, fromType, fromId, toType, toId, strength) => {
    if (!matrixData) return;
    const existing = matrixData.correlations || [];
    
    let updatedCorrelations;
    if (strength === 'none') {
      updatedCorrelations = existing.filter(c => 
        !(c.fromType === fromType && c.fromId === fromId && c.toType === toType && c.toId === toId)
      );
    } else {
      const idx = existing.findIndex(c => c.fromType === fromType && c.fromId === fromId && c.toType === toType && c.toId === toId);
      if (idx >= 0) {
        updatedCorrelations = [...existing];
        updatedCorrelations[idx] = { ...updatedCorrelations[idx], strength };
      } else {
        updatedCorrelations = [
          ...existing, 
          { id: generateId(), fromType, fromId, toType, toId, strength }
        ];
      }
    }

    await updateMatrixField(mId, { correlations: updatedCorrelations });
  }, [matrixData, updateMatrixField]);

  const setAccountability = useCallback(async (mId, initiativeId, initiativeType, ownerId, supportIds = []) => {
    if (!matrixData) return;
    const existing = matrixData.accountability || [];
    
    let updatedAccountability;
    const idx = existing.findIndex(a => a.initiativeId === initiativeId && a.initiativeType === initiativeType);
    
    if (idx >= 0) {
      updatedAccountability = [...existing];
      if (!ownerId && supportIds.length === 0) {
        // remove if empty
        updatedAccountability.splice(idx, 1);
      } else {
        updatedAccountability[idx] = { ...updatedAccountability[idx], ownerId, supportIds };
      }
    } else {
      if (ownerId || supportIds.length > 0) {
        updatedAccountability = [
          ...existing,
          { id: generateId(), initiativeId, initiativeType, ownerId, supportIds }
        ];
      } else {
        updatedAccountability = existing;
      }
    }

    await updateMatrixField(mId, { accountability: updatedAccountability });
  }, [matrixData, updateMatrixField]);

  const deleteItem = useCallback(async (mId, section, itemId) => {
    if (!matrixData || !matrixData[section]) return;
    
    // Remove item
    const updatedSection = matrixData[section].filter(item => item.id !== itemId);
    
    // Clean up orphans in correlations and accountability
    const updatedCorrelations = (matrixData.correlations || []).filter(c => 
      c.fromId !== itemId && c.toId !== itemId
    );
    
    const updatedAccountability = (matrixData.accountability || []).filter(a => 
      a.initiativeId !== itemId
    );

    await updateMatrixField(mId, {
      [section]: updatedSection,
      correlations: updatedCorrelations,
      accountability: updatedAccountability
    });
  }, [matrixData, updateMatrixField]);

  return {
    matrixData,
    matrixId,
    loading,
    error,
    addLongTermGoal,
    addAnnualObjective,
    addTacticalPriority,
    addKpi,
    setCorrelation,
    setAccountability,
    deleteItem,
    updateMatrixField
  };
};
