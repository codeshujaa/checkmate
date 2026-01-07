import React, { useState, useEffect } from 'react';
import { packages } from '../services/api';
import { Edit, Trash2, Plus, X } from 'lucide-react';

const AdminPackages = () => {
    const [pkgList, setPkgList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPkg, setEditingPkg] = useState(null);
    const [formData, setFormData] = useState({
        name: '', price: '', currency: 'KSH', slots: '', features: '', unavailable: false, highlight: false, offer: '', available_slots: 0
    });

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const res = await packages.getAll();
            setPkgList(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (pkg) => {
        setEditingPkg(pkg);
        let featuresStr = '';
        try {
            featuresStr = JSON.parse(pkg.features).join('\n');
        } catch (e) {
            featuresStr = pkg.features; // Fallback
        }

        setFormData({
            ...pkg,
            features: featuresStr
        });
        setShowModal(true);
    };

    const handleAddNew = () => {
        setEditingPkg(null);
        setFormData({ name: '', price: '', currency: 'KSH', slots: '', features: '', unavailable: false, highlight: false, offer: '', available_slots: 0 });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this package?")) return;
        try {
            await packages.delete(id);
            fetchPackages();
        } catch (e) { alert("Failed to delete"); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Convert features back to JSON array
        const featureArray = formData.features.split('\n').filter(f => f.trim() !== '');
        const payload = {
            ...formData,
            features: JSON.stringify(featureArray),
            price: parseFloat(formData.price),
            slots: parseInt(formData.slots),
            available_slots: parseInt(formData.available_slots) || 0
        };

        try {
            if (editingPkg) {
                await packages.update(editingPkg.id, payload);
            } else {
                await packages.create(payload);
            }
            setShowModal(false);
            fetchPackages();
        } catch (e) { alert("Failed to save"); }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="admin-packages fade-in">
            <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Pricing Packages</h2>
                <button className="btn btn-primary" onClick={handleAddNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={16} /> Add Package
                </button>
            </div>

            <div className="card" style={{ overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                <div className="table-responsive">
                    <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Name</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Price</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Slots</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Status</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pkgList.map((pkg, index) => (
                                <tr key={pkg.id} style={{ borderBottom: index !== pkgList.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>{pkg.name}</span>
                                            {pkg.offer && (
                                                <span style={{
                                                    display: 'inline-block',
                                                    width: 'fit-content',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '700',
                                                    background: '#e0f2fe',
                                                    color: '#0284c7',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {pkg.offer}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle', fontWeight: '500', color: '#334155' }}>
                                        {pkg.currency} {pkg.price}
                                    </td>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle', color: '#64748b' }}>
                                        {pkg.slots}
                                    </td>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                                        <span style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: pkg.unavailable ? '#fee2e2' : '#dcfce7',
                                            color: pkg.unavailable ? '#991b1b' : '#166534'
                                        }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
                                            {pkg.unavailable ? 'Unavailable' : 'Active'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleEdit(pkg)}
                                                style={{
                                                    width: '32px', height: '32px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: '#f1f5f9', borderRadius: '8px',
                                                    color: '#475569', transition: 'all 0.2s',
                                                    border: 'none', cursor: 'pointer'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleDelete(pkg.id)}
                                                style={{
                                                    width: '32px', height: '32px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: '#fee2e2', borderRadius: '8px',
                                                    color: '#ef4444', transition: 'all 0.2s',
                                                    border: 'none', cursor: 'pointer'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.background = '#fecaca'; e.currentTarget.style.color = '#dc2626'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content card" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{editingPkg ? 'Edit Package' : 'New Package'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Package Name</label>
                                <input name="name" className="form-control" value={formData.name} onChange={handleChange} required placeholder="e.g. 3 Slots" />
                            </div>
                            <div className="row">
                                <div className="form-group">
                                    <label>Price</label>
                                    <input name="price" type="number" className="form-control" value={formData.price} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Currency</label>
                                    <input name="currency" className="form-control" value={formData.currency} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Number of Slots</label>
                                <input name="slots" type="number" className="form-control" value={formData.slots} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Features (One per line)</label>
                                <textarea name="features" className="form-control" rows="4" value={formData.features} onChange={handleChange} required placeholder="1 Document Check&#10;AI Detection" />
                            </div>
                            <div className="form-group">
                                <label>Offer Badge (Optional)</label>
                                <input name="offer" className="form-control" value={formData.offer} onChange={handleChange} placeholder="e.g. POPULAR" />
                            </div>
                            <div className="form-group">
                                <label>Available Slots (Inventory)</label>
                                <input name="available_slots" type="number" min="0" className="form-control" value={formData.available_slots} onChange={handleChange} required placeholder="How many can be purchased" />
                                <small style={{ color: '#6b7280' }}>Set to 0 to mark as sold out</small>
                            </div>
                            <div className="form-group checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input type="checkbox" name="unavailable" checked={formData.unavailable} onChange={handleChange} />
                                    <span>Set as Unavailable (Hidden/Disabled)</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input type="checkbox" name="highlight" checked={formData.highlight} onChange={handleChange} />
                                    <span>Highlight (Primary Color/Best Value)</span>
                                </label>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Package</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPackages;
