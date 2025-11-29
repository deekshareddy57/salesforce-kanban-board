import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import deleteRecord from '@salesforce/apex/getCustomMetaData.deleteRecord';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class Card extends NavigationMixin(LightningElement) {
    @api record;
    @api displayFields; // Passed from parent e.g. ['Name', 'Email', 'Phone']
    @api metadataName;

    // Optimize: Compute fields for display without Apex
    get processedFields() {
        if (!this.record || !this.displayFields) return [];
        
        let fields = [];
        this.displayFields.forEach(field => {
            // Don't show Id or Name again in the body
            if (field !== 'Id' && field !== 'Name' && this.record[field]) {
                fields.push({ key: field, value: this.record[field] });
            }
        });
        return fields;
    }

    // 1. Dynamic CSS Class Logic (Keep this if you used it)
    get cardClass() {
        let baseClass = 'card ';
        if (this.metadataName === 'Lead_Kanban') {
             if (this.record.Rating === 'Hot') return baseClass + 'accent-red';
             if (this.record.Rating === 'Warm') return baseClass + 'accent-orange';
             return baseClass + 'accent-blue';
        }
        if (this.metadataName === 'Opportunity_Kanban') {
             if (this.record.Amount > 50000) return baseClass + 'accent-green';
             return baseClass + 'accent-purple';
        }
        if (this.metadataName === 'Case_Kanban') {
             if (this.record.Priority === 'High' || this.record.Priority === 'Critical') return baseClass + 'accent-red';
             return baseClass + 'accent-grey';
        }
        return baseClass + 'accent-blue';
    }

    handleDragStart(event) {
        // 1. Log immediately to prove the function fired
        console.log('DRAG START FIRED on ID:', this.record.Id);

        const path = event.composedPath();

        // 2. Check if user clicked a Button, Link, or Menu
        const isInteractive = path.some(element => {
            if (element.tagName) {
                const tag = element.tagName.toLowerCase();
                // Add 'lightning-icon' or others if needed
                return tag === 'lightning-button-menu' || 
                       tag === 'lightning-menu-item' || 
                       tag === 'a' || 
                       tag === 'button';
            }
            return false;
        });

        // 3. If interactive, KILL the drag
        if (isInteractive) {
            console.log('Blocking drag because user clicked a button');
            event.preventDefault(); 
            return;
        }

        // 4. Safe to Drag
        event.dataTransfer.setData('text', this.record.Id);
        event.dataTransfer.effectAllowed = 'move';
        
        this.dispatchEvent(new CustomEvent('itemdrag', { 
            detail: this.record.Id, 
            bubbles: true, 
            composed: true 
        }));
    }
    // --- FIX ENDS HERE ---

    // --- NEW: Handle Navigation to Detail Page ---
    navigateToRecord(event) {
        event.preventDefault(); // Stop the link from refreshing the page
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.record.Id,
                actionName: 'view'
            }
        });
    }

    // --- NEW: Handle Standard Edit Modal ---
    handleEdit() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.record.Id,
                actionName: 'edit'
            }
        });
    }

    handleDelete() {
        deleteRecord({ sObjectApiName: this.metadataName, sObjId: this.record.Id })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({title: 'Success', message: 'Deleted', variant: 'success'}));
                // In a real app, you should fire an event to parent to refresh the board
            })
            .catch(error => {
                 this.dispatchEvent(new ShowToastEvent({title: 'Error', message: 'Delete failed', variant: 'error'}));
            });
    }

    get cardClass() {
        let baseClass = 'card ';
        
        // 1. LOGIC FOR LEADS (Based on Rating)
        if (this.metadataName === 'Lead_Kanban') {
            if (this.record.Rating === 'Hot') return baseClass + 'accent-red';
            if (this.record.Rating === 'Warm') return baseClass + 'accent-orange';
            return baseClass + 'accent-blue'; // Cold or blank
        }

        // 2. LOGIC FOR OPPORTUNITIES (Based on Amount or Stage)
        if (this.metadataName === 'Opportunity_Kanban') {
            // High Value Opps get Gold/Green
            if (this.record.Amount > 50000) return baseClass + 'accent-green';
            // You could also check Probability
            if (this.record.Probability >= 90) return baseClass + 'accent-green';
            return baseClass + 'accent-purple'; // Standard Opp
        }

        // 3. LOGIC FOR CASES (Based on Priority)
        if (this.metadataName === 'Case_Kanban') {
            if (this.record.Priority === 'High' || this.record.Priority === 'Critical') {
                return baseClass + 'accent-red';
            }
            return baseClass + 'accent-grey';
        }

        // Fallback
        return baseClass + 'accent-blue';
    }
}