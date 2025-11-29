public with sharing class getCustomMetaData {

    // --- NEW OPTIMIZED MASTER METHOD ---
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getKanbanDetails(String metadataName) {
        Map<String, Object> result = new Map<String, Object>();
        
        // 1. Fetch Metadata Config
        Kanban_Metadata__mdt config = Kanban_Metadata__mdt.getInstance(metadataName);
        if (config == null) {
            throw new AuraHandledException('Metadata not found: ' + metadataName);
        }
        
        String sObjName = config.sObjectAPIName__c;
        String groupByField = config.Group_By_Field__c;
        String queryFields = config.query_Fields__c;

        // 2. Get Columns (Picklist Values)
        List<String> columns = new List<String>();
        Schema.DescribeFieldResult fieldResult = Schema.getGlobalDescribe()
            .get(sObjName).getDescribe().fields.getMap().get(groupByField).getDescribe();
        
        for(Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            columns.add(entry.getLabel());
        }

        // 3. Build & Execute Query
        // Ensure Id and GroupBy field are included
        Set<String> fieldsToQuery = new Set<String>();
        fieldsToQuery.add('Id');
        fieldsToQuery.add(groupByField);
        if(String.isNotBlank(queryFields)) {
            for(String f : queryFields.split(',')) {
                fieldsToQuery.add(f.trim());
            }
        }
        
        String queryString = 'SELECT ' + String.join(new List<String>(fieldsToQuery), ',') + 
                             ' FROM ' + sObjName + 
                             ' ORDER BY CreatedDate DESC LIMIT 200';
                             
        List<SObject> records = Database.query(queryString);

        // 4. Return everything in one packet
        result.put('columns', columns);
        result.put('records', records);
        result.put('sobjectName', sObjName);
        result.put('groupByField', groupByField);
        result.put('displayFields', new List<String>(fieldsToQuery)); // Helping the card know what to show
        
        return result;
    }

    // --- KEEPING YOUR OLD METHOD FOR UPDATE LOGIC ---
    @AuraEnabled
    public static void updateFieldsinSobj(String sObjectApiName, String sObjId, String updatedPickVal, String FieldToBeUpdated) {
        // Need to resolve the actual sObject API Name from metadata first to be safe
        Kanban_Metadata__mdt kanbanRec = Kanban_Metadata__mdt.getInstance(sObjectApiName);
        String actualObjName = kanbanRec.sObjectAPIName__c;

        SObject sobj = Schema.getGlobalDescribe().get(actualObjName).newSObject();
        sobj.put('Id', sObjId);
        sobj.put(FieldToBeUpdated, updatedPickVal);
        update sobj;
    }
    
    // Keeping your delete method
    @AuraEnabled
    public static void deleteRecord(String sObjectApiName, String sObjId) {
         Kanban_Metadata__mdt kanbanRec = Kanban_Metadata__mdt.getInstance(sObjectApiName);
         String actualObjName = kanbanRec.sObjectAPIName__c;
         
         SObject sobj = Schema.getGlobalDescribe().get(actualObjName).newSObject();
         sobj.put('Id', sObjId);
         delete sobj;
    }
    
}