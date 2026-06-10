import React from 'react';

const TopBar = ({
    notifCount, setNotifCount,
    user, isUserDropdownOpen, setIsUserDropdownOpen,
    userMenuRef, navigate, handleLogout, setIsPassModalOpen
}) => {
    return (
        <header className="top-header" style={{
            backgroundColor: '#003399', height: '60px', display: 'flex',
            alignItems: 'center', padding: '0 25px', justifyContent: 'space-between',
            color: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', position: 'relative'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

                <div className="search-wrapper" style={{ position: 'relative' }}>
                    <i className="fa-solid fa-magnifying-glass search-icon-white"></i>
                    <input type="text" placeholder="Tìm kiếm" className="topbar-search-input" />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setNotifCount(0)}>
                    <i className="fa-regular fa-bell" style={{ fontSize: '20px', color: '#fff' }}></i>
                    {notifCount > 0 && (
                        <span className="notif-badge">{notifCount}</span>
                    )}
                </div>

                <div style={{ position: 'relative' }} ref={userMenuRef}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                                {user?.HoTen || "Người dùng"}
                            </div>
                        </div>
                        <div className="user-avatar-circle">
                            {user?.AvatarUrl ? (
                                <img src={user.AvatarUrl} alt="Avatar" />
                            ) : (user?.FirstName?.charAt(0) || 'U')}
                        </div>
                    </div>

                    {isUserDropdownOpen && (
                        <div className="user-menu-dropdown">
                            <div className="dropdown-header">
                                <div className="avatar-large">
                                    {user?.AvatarUrl ? (
                                        <img src={user.AvatarUrl} alt="Avatar" />
                                    ) : (user?.FirstName?.charAt(0) || 'U')}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <strong style={{ display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {user?.HoTen}
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#888', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {user?.Email}
                                    </p>
                                </div>
                            </div>
                            <div className="dropdown-divider"></div>
                            <div className="dropdown-item" onClick={() => { navigate('/thong-tin-lien-he'); setIsUserDropdownOpen(false); }}>
                                <i className="fa-regular fa-user"></i> Hồ sơ của tôi
                            </div>
                            <div className="dropdown-item" onClick={() => { setIsPassModalOpen(true); setIsUserDropdownOpen(false); }}>
                                <i className="fa-solid fa-key"></i> Đổi mật khẩu
                            </div>
                            <div className="dropdown-divider"></div>
                            <div className="dropdown-item logout" onClick={handleLogout}>
                                <i className="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;