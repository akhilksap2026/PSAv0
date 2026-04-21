# Feature Testing Guide - PSA RocketLine

## Quick Start: How to Test All New Features

### Test Users Available:
- **admin@example.com** - Admin role (can approve timesheets)
- **pm@example.com** - Project Manager role (can manage resources)
- **developer@example.com** - Team Member role
- **resource@example.com** - Resource Manager role

---

## Phase 1: Time Tracking Features

### Test 1.1: Submit & Approve Timesheet
**Steps:**
1. Login as `developer@example.com`
2. Go to **Dashboard → Timesheets**
3. Enter hours for a project (e.g., "8" for Monday)
4. Click **Submit Timesheet** button
5. Logout and login as `pm@example.com`
6. Go to **Timesheets → Approvals**
7. See the pending timesheet from developer
8. Click **Approve** button
9. Switch back to developer account → **Timesheets → History**
10. See the approved timesheet

**Expected Result:** Timesheet moves from "submitted" to "approved" status

---

### Test 1.2: Request Time-Off
**Steps:**
1. Login as `developer@example.com`
2. Go to **Dashboard → Timesheets**
3. Click **Request Time Off** button
4. Select "Vacation" as type
5. Set Start Date: 3 days from now
6. Set End Date: 5 days from now
7. Add reason: "Summer vacation"
8. Click **Submit Request**
9. Check your email/notifications (in real projects)

**Expected Result:** Time-off request is recorded in database

---

### Test 1.3: View Timesheet History
**Steps:**
1. Login as `developer@example.com`
2. Go to **Dashboard → Timesheets → History**
3. See all approved and rejected timesheets
4. Click on any timesheet to see details
5. Verify dates and hours are correct

**Expected Result:** All past timesheets visible with status

---

## Phase 2: Resource Management Features

### Test 2.1: Add Skills to Team Members
**Steps:**
1. Login as `pm@example.com` or `admin@example.com`
2. Go to **Dashboard → Resources**
3. Click **Add Skill** button
4. Select "Alice Johnson" (or another team member)
5. Enter skill: "React"
6. Set proficiency: "Expert"
7. Click **Add Skill**
8. See the skill appears in skills matrix
9. Repeat with other skills and proficiency levels

**Expected Result:** Skills visible in matrix, can add/remove freely

---

### Test 2.2: View Allocation Grid
**Steps:**
1. Go to **Dashboard → Resources → Projects**
2. Scroll to "Resource Allocation Grid"
3. See team members with project allocations
4. Check color-coded allocation bars
5. Verify total allocation % (should show warnings if >100%)

**Expected Result:** Visual allocation display showing all assignments

---

### Test 2.3: Resource Capacity View
**Steps:**
1. Go to **Dashboard → Resources → People**
2. See "Team Capacity" section
3. Check utilization percentage for each member
4. Color coding: Blue <60%, Green 60-80%, Orange >80%

**Expected Result:** Capacity metrics displayed with proper color coding

---

## Phase 3: Financial Features

### Test 3.1: Create Rate Card
**Steps:**
1. Login as `admin@example.com`
2. Go to **Dashboard → Billing → Rate Cards**
3. Click **New Rate Card**
4. Fill in:
   - Name: "Senior Developer"
   - Description: "5+ years experience"
   - Currency: "USD"
   - Active: Check
5. Click **Create**
6. See the rate card in list

**Expected Result:** Rate card created and visible in dashboard

---

### Test 3.2: Create Invoice
**Steps:**
1. Go to **Dashboard → Billing → Invoices**
2. Click **New Invoice**
3. Fill in:
   - Project: Select any active project
   - Amount: 5000
   - Status: "Sent"
   - Due Date: 30 days from now
4. Click **Create Invoice**
5. See summary stats update (Total Revenue, Pending)

**Expected Result:** Invoice appears in list with correct status

---

### Test 3.3: Track Revenue Recognition
**Steps:**
1. Go to **Dashboard → Billing → Revenue**
2. See summary metrics:
   - Total Revenue
   - Recognized vs. Pending
   - Recognition Rate %
3. View revenue records by project
4. Check progress bars showing recognition

**Expected Result:** Revenue metrics display correctly

---

## Phase 4: Approvals & Reports

### Test 4.1: Central Approval Dashboard
**Steps:**
1. Login as `pm@example.com` (manager role)
2. Go to **Dashboard → Approvals**
3. See summary cards showing:
   - Pending Approval count
   - Approved count
   - Rejected count
4. Click **Pending** tab
5. See all items needing approval

**Expected Result:** Approval dashboard shows all pending items

---

### Test 4.2: View All Reports
**Steps:**
1. Go to **Dashboard → Reports**
2. See key metrics at top:
   - Active Projects
   - Tasks Completed
   - Total Hours
   - Team Members
3. Click each tab to view:
   - **Project Performance** - Project status overview
   - **Financial** - Budget allocation, billing methods
   - **Team Utilization** - Utilization %, skills distribution, capacity planning
   - **Budget Forecast** - Spending projections, quarterly forecast
   - **Skills & Expertise** - Skill matrix with demand indicators

**Expected Result:** All reports display with realistic data

---

### Test 4.3: Export Reports
**Steps:**
1. Go to **Dashboard → Reports → Team Utilization**
2. Scroll to bottom and click **Export Report**
3. Report downloads as CSV/Excel

**Expected Result:** Downloadable report file

---

## Feature Checklist

### Time Tracking ✅
- [ ] Submit timesheet
- [ ] Approve timesheet as manager
- [ ] Reject timesheet as manager
- [ ] Request time-off
- [ ] View history of timesheets
- [ ] See time-off request status

### Resources ✅
- [ ] Add skills to team members
- [ ] Set proficiency levels
- [ ] View skills matrix
- [ ] See allocation percentages
- [ ] Get over-allocation warnings
- [ ] View team capacity metrics

### Financial ✅
- [ ] Create rate card
- [ ] Edit rate card
- [ ] Delete rate card
- [ ] Create invoice
- [ ] Track invoice status
- [ ] View revenue recognition
- [ ] See revenue forecasts

### Approvals & Reports ✅
- [ ] View pending approvals
- [ ] See approved items
- [ ] See rejected items
- [ ] View project performance
- [ ] View financial summary
- [ ] View team utilization
- [ ] View budget forecast
- [ ] View skills expertise
- [ ] Export reports

---

## Known Behaviors

1. **Timesheet Status Flow**: Draft → Submitted → Approved/Rejected
2. **Allocation Warning**: Shows when total > 100%
3. **Revenue Recognition**: Automatically calculates based on method
4. **Notifications**: Created when timesheet is approved/rejected
5. **Export**: Downloads as CSV format

---

## Troubleshooting

### Issue: "User not found" when approving timesheet
**Solution:** Make sure you're logged in as a manager (pm@example.com or admin@example.com)

### Issue: Skills don't save
**Solution:** Check browser console for errors, ensure user is properly authenticated

### Issue: Invoices not showing
**Solution:** Make sure projects exist first, create projects before creating invoices

### Issue: Allocation shows 0%
**Solution:** Allocations are populated from database - they're shown but not auto-created

---

## Browser Requirements

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

JavaScript must be enabled for all features.

---

## Performance Notes

- Large teams (100+) may have slight delays in resource allocation view
- Reports generate in <2 seconds for organizations with <1000 projects
- Real-time updates require page refresh currently

---

## Next Steps After Testing

1. Verify all features work with your data
2. Test edge cases (large files, many records)
3. Check role-based access (what each role can do)
4. Test on mobile devices
5. Verify email notifications (if configured)
6. Load test with concurrent users

---

## Support & Feedback

For issues or feature requests, please contact the development team or submit a GitHub issue.
