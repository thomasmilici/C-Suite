/**
 * Mock utility for Hoshin Kanri Digital-Native Bento.
 * Determines if a given item (myId, myType) is correlated to the currently activeStrategyNode.
 * In a real app, this would query the `mission.correlations` array.
 */
export function checkCorrelation(myId, myType, activeStrategyNode) {
    if (!activeStrategyNode || !myId) return false;
    if (activeStrategyNode.id === myId) return false; // Non sé stesso
    
    // Pseudo-random ma predicibile (mockup)
    const str1 = String(myId);
    const str2 = String(activeStrategyNode.id);
    const typeBoost = myType !== activeStrategyNode.type ? 1 : 0; // Favoriamo correlazioni tra tipi diversi
    
    const hash = (str1.length + str2.length + typeBoost * 2) % 4;
    
    // Correlati se hash è 0 o 1
    return hash <= 1;
}
