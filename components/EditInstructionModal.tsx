import React, { useState } from 'react';
import { Group } from '../types';

interface Props {
    group: Group | null;
    onClose: () => void;
    setInstruction: (instruction: string) => void;
}

const EditInstructionModal: React.FC<Props> = ({ group, onClose, setInstruction }) => {
    const [newInstruction, setNewInstruction] = useState(group?.instruction || '');

    const handleSave = async () => {
        if (!group) return;
        try {
            const response = await fetch(`/api/groups/${group._id}/instruction`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instruction: newInstruction }),
            });
            if (response.ok) {
                setInstruction(newInstruction);
                onClose();
            } else {
                console.error('Failed to update instruction');
            }
        } catch (error) {
            console.error('Error updating instruction:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Modifier la consigne</h2>
                <textarea
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={4}
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                />
                <div className="flex justify-end mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md mr-2 hover:bg-gray-400"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditInstructionModal;
