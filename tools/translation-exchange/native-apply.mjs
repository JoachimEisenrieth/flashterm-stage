import { reviewNative } from './native-review.mjs';
const assert = (v,m) => { if (!v) throw new Error(m); };
export function buildApplyPlan(prepared, request, approvedRowIds) {
    assert(Array.isArray(approvedRowIds) && approvedRowIds.length > 0 && new Set(approvedRowIds).size === approvedRowIds.length, 'Bitte unterschiedliche Positionen auswählen.');
    const {result,snapshot}=reviewNative(prepared,request);
    const byId=new Map(result.rows.map(r=>[r.rowId,r]));
    const selected=approvedRowIds.map(id=>byId.get(id));
    assert(selected.every(r=>r && ['ready','unchanged'].includes(r.status)), 'Eine ausgewählte Position ist inzwischen gesperrt. Bitte erneut prüfen.');
    const changes=selected.filter(r=>r.status==='ready');
    const terms=request.terms ? request.terms.split('␞').map(x=>x.split('␟')):[];
    const defs=request.definitions ? request.definitions.split('␞').map(x=>x.split('␟')):[];
    const operations=[];
    for(const row of changes) {
        const language=snapshot.concepts.find(c=>c.id===row.conceptId)?.languages.find(l=>l.code===row.target);
        const preferred=language?.terms.filter(t=>t.weighting===2)??[];
        const selectedTerm=selected.find(r=>r.conceptId===row.conceptId && r.field==='preferredTerm');
        assert(preferred.length===1 || selectedTerm?.after.trim(), 'Eine neue Sprachebene benötigt auch eine freigegebene Vorzugsbenennung.');
        // New record creation will be added only after native defaults and required fields
        // have been verified for every language. Existing empty fields can be filled.
        if(row.field==='preferredTerm') {
            assert(preferred.length===1, 'Diese Position benötigt eine neue Benennung. Dieser Entwicklungsstand übernimmt nur vorhandene Ziel-Datensätze.');
            operations.push({table:'AT_Term',id:preferred[0].id,conceptId:row.conceptId,language:row.target,field:'term',before:row.before,after:row.after,rowId:row.rowId,kind:'translation'});
        } else {
            assert(defs.some(d=>d[0]===row.conceptId && d[1]===row.target), 'Diese Position benötigt eine neue Definition. Dieser Entwicklungsstand übernimmt nur vorhandene Ziel-Datensätze.');
            operations.push({table:'AT_Definition',conceptId:row.conceptId,language:row.target,field:'definition',before:row.before,after:row.after,rowId:row.rowId,kind:'translation'});
            for(const t of terms.filter(t=>t[1]===row.conceptId && t[2]===row.target)) operations.push({table:'AT_Term',id:t[0],conceptId:row.conceptId,language:row.target,field:'definition',after:row.after,rowId:row.rowId,kind:'derived'});
        }
    }
    const locks=[...new Set(changes.map(r=>r.conceptId))].map(id=>({table:'AT_Concept',id}));
    // Lock the complete read scope, including source records, before comparing it again.
    for(const t of terms) locks.push({table:'AT_Term',id:t[0]});
    for(const d of defs) locks.push({table:'AT_Definition',conceptId:d[0],language:d[1]});
    assert(locks.every(l=>!l.id || /^\d+$/u.test(l.id)), 'Ungültige native Datensatzkennung.');
    return {format:'flashterm-native-apply/1',jobId:prepared.jobId,identity:prepared.job.identity,createdAt:new Date().toISOString(),approvedRowIds,changes,unchanged:selected.length-changes.length,operations,locks,baseline:{terms:request.terms,definitions:request.definitions,languages:request.languages},status:'prepared',databaseChanged:false};
}
