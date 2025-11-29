import { LightningElement, api } from 'lwc';

export default class KanbanChild extends LightningElement {
    @api records = [];
    @api stage;
    @api groupByField;
    @api metadataName;
    @api displayFields;

    handleDragOver(event) {
        event.preventDefault(); // Essential to allow dropping
    }

    handleDrop(event) {
        event.preventDefault();

        // FIX: We do NOT define 'const recordId' here anymore.
        // We do NOT try to console.log(recordId).
        // We just tell the Parent: "Drop happened in this stage."
        
        this.dispatchEvent(new CustomEvent('listitemdrop', {
            detail: this.stage 
        }));
    }

    handleNativeDragStart(event) {
        // 1. Get the ID from the <c-card> data-id attribute
        const recordId = event.target.dataset.id;
        
        console.log('CHILD: 🔥 Native Drag Caught! ID:', recordId);

        if (recordId) {
            // 2. Pass it up to the Parent
            this.dispatchEvent(new CustomEvent('listitemdrag', {
                detail: recordId
            }));
        }
    }
}