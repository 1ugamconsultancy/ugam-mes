export function provenance(sourceKind: 'RECORDED' | 'DERIVED' | 'SIMULATED', observedAt: any, missingInputs: string[] = [], sourceReferences: any[] = [], period: any = null, staleAfterSeconds = 300) {
    const observed = observedAt ? new Date(observedAt).toISOString() : null;
    return { sourceKind, availability: missingInputs.length ? 'UNAVAILABLE' : (!period && observed && Date.now() - Date.parse(observed) > staleAfterSeconds * 1000 ? 'STALE' : 'AVAILABLE'), observedAt: observed, reportingPeriod: period, sourceReferences, missingInputs, staleAfterSeconds };
}
