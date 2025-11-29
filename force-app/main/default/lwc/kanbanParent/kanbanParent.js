import { LightningElement, api, wire, track } from 'lwc';
import getKanbanDetails from '@salesforce/apex/getCustomMetaData.getKanbanDetails';
import { NavigationMixin } from 'lightning/navigation';
import updateFieldsinSobj from '@salesforce/apex/getCustomMetaData.updateFieldsinSobj';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class KanbanParent extends NavigationMixin(LightningElement) {
    @track customMetadataApi = 'Lead_Kanban'; 
    currentSObjectName;
    @track kanbanBoardData = [];
    wiredResult;
    groupByField;
    displayFields;
    draggedRecordId;

    get leadVariant() { return this.customMetadataApi === 'Lead_Kanban' ? 'brand' : 'neutral'; }
    get oppVariant() { return this.customMetadataApi === 'Opportunity_Kanban' ? 'brand' : 'neutral'; }
    get caseVariant() { return this.customMetadataApi === 'Case_Kanban' ? 'brand' : 'neutral'; }

    @wire(getKanbanDetails, { metadataName: '$customMetadataApi' })
    wiredKanban(result) {
        this.wiredResult = result;
        const { data, error } = result;

        if (data) {
            this.groupByField = data.groupByField;
            this.displayFields = data.displayFields;
            // Store object name for the New button fallback
            this.currentSObjectName = data.sobjectName; 
            
            const stageMap = {};
            data.columns.forEach(col => { stageMap[col] = []; });

            data.records.forEach(rec => {
                const status = rec[this.groupByField];
                if (stageMap[status]) {
                    stageMap[status].push(rec);
                }
            });

            this.kanbanBoardData = Object.keys(stageMap).map(stage => {
                return { stageName: stage, records: stageMap[stage] };
            });

        } else if (error) {
            console.error('Error', error);
            this.dispatchEvent(new ShowToastEvent({title: 'Error', message: 'Could not load board', variant: 'error'}));
        }
    }

    handleObjectSwitch(event) {
        this.customMetadataApi = event.target.value; 
        this.kanbanBoardData = null; 
    }

    handleDragStart(event) {
        // The ID comes from the Child's event detail
        const recId = event.detail;
        console.log('PARENT: 🟢 Drag Start Captured! Saving ID:', recId);
        this.draggedRecordId = recId;
    }

    handleDrop(event) {
        //const { recordId, newStage } = event.detail;
        //console.log('PARENT HANDLE DROP: Event Detail:', JSON.stringify(event.detail));
        const newStage = event.detail; 
        const recordId = this.draggedRecordId; 

        // LOGGING FOR DEBUGGING
        console.log('PARENT: 🟡 Drop Event Triggered');
        console.log('PARENT: 🟡 ID in Memory:', recordId);
        console.log('PARENT: 🟡 New Stage:', newStage);

        if (!recordId) {
            console.error('PARENT: 🔴 CRITICAL FAILURE - Record ID is undefined.');
            this.dispatchEvent(new ShowToastEvent({title: 'Error', message: 'Drag failed to capture ID', variant: 'error'}));
            return;
        }

        updateFieldsinSobj({
            sObjectApiName: this.customMetadataApi,
            sObjId: recordId,
            updatedPickVal: newStage,
            FieldToBeUpdated: this.groupByField
        })
        .then(() => {
            this.dispatchEvent(new ShowToastEvent({title: 'Success', message: 'Record Moved', variant: 'success'}));
            return refreshApex(this.wiredResult);
        })
        .catch(error => {
            console.error('Update Failed:', JSON.stringify(error));
            
            // SENIOR DEV FIX: Extract the actual error message from the API response
            let message = 'Move failed';
            if (error && error.body && error.body.message) {
                message = error.body.message;
            } else if (error && error.body && error.body.pageErrors && error.body.pageErrors.length > 0) {
                message = error.body.pageErrors[0].message;
            }
            
            this.dispatchEvent(new ShowToastEvent({title: 'Error', message: message, variant: 'error'}));
        });
    }
    
    handleNewRecord() {
        let targetObject;
        
        if (this.customMetadataApi.includes('Lead')) {
            targetObject = 'Lead';
        } else if (this.customMetadataApi.includes('Opportunity')) {
            targetObject = 'Opportunity';
        } else if (this.customMetadataApi.includes('Case')) {
            targetObject = 'Case';
        } else {
            targetObject = this.currentSObjectName;
        }

        if (targetObject) {
            this[NavigationMixin.Navigate]({
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: targetObject,
                    actionName: 'new'
                }
            });
        }
    }

    get summaryMetrics() {
        if (!this.kanbanBoardData) return [];

        const allRecords = this.kanbanBoardData.flatMap(col => col.records);
        let metrics = [];

        // 1. LEAD METRICS
        if (this.customMetadataApi.includes('Lead')) {
            // FIX: actually calculate the variables
            const total = allRecords.length;
            const hotLeads = allRecords.filter(r => r.Rating === 'Hot').length;

            metrics.push({ label: 'Total Leads', value: total, icon: 'utility:groups', className: 'metric-value' });
            metrics.push({ 
                label: 'Hot Leads', 
                value: hotLeads, 
                icon: 'utility:fire', 
                className: 'metric-value color-red'
            });
        } 
        
        // 2. OPPORTUNITY METRICS
        else if (this.customMetadataApi.includes('Opportunity')) {
            const totalValue = allRecords.reduce((sum, r) => sum + (r.Amount || 0), 0);
            const formattedValue = new Intl.NumberFormat('en-US', { 
                style: 'currency', currency: 'USD', maximumFractionDigits: 0 
            }).format(totalValue);

            metrics.push({ label: 'Pipeline Value', value: formattedValue, icon: 'utility:moneybag', className: 'metric-value' });
            metrics.push({ label: 'Open Deals', value: allRecords.length, icon: 'utility:graph', className: 'metric-value' });
        } 
        
        // 3. CASE METRICS
        else if (this.customMetadataApi.includes('Case')) {
            // FIX: actually calculate the variables
            const critical = allRecords.filter(r => r.Priority === 'High' || r.Priority === 'Critical').length;
            
            metrics.push({ label: 'Total Cases', value: allRecords.length, icon: 'utility:case', className: 'metric-value' });
            metrics.push({ 
                label: 'Critical Escalations', 
                value: critical, 
                icon: 'utility:warning', 
                className: 'metric-value color-red'
            });
        }

        return metrics;
    }
}