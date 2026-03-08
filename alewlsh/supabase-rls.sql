ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE panic_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_pass_routes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Emergency contacts policies
CREATE POLICY "Users can view own emergency contacts" ON emergency_contacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert emergency contacts with limit" ON emergency_contacts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        (
            (SELECT is_premium FROM profiles WHERE id = auth.uid()) = TRUE OR
            (SELECT COUNT(*) FROM emergency_contacts WHERE user_id = auth.uid()) < 2
        )
    );

CREATE POLICY "Users can update own emergency contacts" ON emergency_contacts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emergency contacts" ON emergency_contacts
    FOR DELETE USING (auth.uid() = user_id);

-- Panic alerts policies
CREATE POLICY "Users can view own panic alerts" ON panic_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own panic alerts" ON panic_alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own panic alerts" ON panic_alerts
    FOR UPDATE USING (auth.uid() = user_id);

-- Police can view nearby active panic alerts (within 5km for example)
CREATE POLICY "Police can view nearby active panic alerts" ON panic_alerts
    FOR SELECT USING (
        (SELECT is_police FROM profiles WHERE id = auth.uid()) = TRUE AND
        status = 'active' AND
        ST_DWithin(
            location,
            (SELECT location FROM panic_alerts WHERE id = panic_alerts.id),
            5000 -- 5km radius for police visibility
        )
    );

-- Police can accept panic alerts
CREATE POLICY "Police can accept panic alerts" ON panic_alerts
    FOR UPDATE USING (
        (SELECT is_police FROM profiles WHERE id = auth.uid()) = TRUE AND
        status = 'active'
    );

-- Recordings policies
CREATE POLICY "Users can view recordings for own panic alerts" ON recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM panic_alerts
            WHERE panic_alerts.id = recordings.panic_id
            AND panic_alerts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert recordings for own panic alerts" ON recordings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM panic_alerts
            WHERE panic_alerts.id = recordings.panic_id
            AND panic_alerts.user_id = auth.uid()
        )
    );

-- Police can view recordings for accepted alerts
CREATE POLICY "Police can view recordings for accepted alerts" ON recordings
    FOR SELECT USING (
        (SELECT is_police FROM profiles WHERE id = auth.uid()) = TRUE AND
        EXISTS (
            SELECT 1 FROM panic_alerts
            WHERE panic_alerts.id = recordings.panic_id
            AND panic_alerts.police_accepted_by = auth.uid()
        )
    );

-- Safe pass routes policies (premium only)
CREATE POLICY "Premium users can view own safe pass routes" ON safe_pass_routes
    FOR SELECT USING (
        auth.uid() = user_id AND
        (SELECT is_premium FROM profiles WHERE id = auth.uid()) = TRUE
    );

CREATE POLICY "Premium users can insert safe pass routes" ON safe_pass_routes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        (SELECT is_premium FROM profiles WHERE id = auth.uid()) = TRUE
    );

CREATE POLICY "Premium users can update own safe pass routes" ON safe_pass_routes
    FOR UPDATE USING (
        auth.uid() = user_id AND
        (SELECT is_premium FROM profiles WHERE id = auth.uid()) = TRUE
    );

CREATE POLICY "Premium users can delete own safe pass routes" ON safe_pass_routes
    FOR DELETE USING (
        auth.uid() = user_id AND
        (SELECT is_premium FROM profiles WHERE id = auth.uid()) = TRUE
    );