// ============================================
// FILE: server/scripts/testRoles.js
// Complete API test suite for Role Management
// ============================================

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let testRoleId = '';

// Color codes for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  return { status: response.status, data };
}

// Test 1: Login
async function testLogin() {
  log('\n📝 Test 1: Login with existing user', 'blue');
  
  const { status, data } = await makeRequest('/auth/login', 'POST', {
    email: 'rohinim10032003@gmail.com', // Update with your email
    password: 'rohi0146', // Update with your password
  });

  if (status === 200 && data.accessToken) {
    authToken = data.accessToken;
    log('✅ Login successful', 'green');
    log(`   User: ${data.user.name}`, 'green');
    log(`   Role: ${data.user.role}`, 'green');
    log(`   Role ID: ${data.user.roleId}`, 'green');
    return true;
  } else {
    log('❌ Login failed', 'red');
    log(`   Error: ${data.error}`, 'red');
    return false;
  }
}

// Test 2: Get all roles
async function testGetRoles() {
  log('\n📝 Test 2: Get all roles', 'blue');
  
  const { status, data } = await makeRequest('/roles');

  if (status === 200 && data.roles) {
    log('✅ Roles fetched successfully', 'green');
    log(`   Total roles: ${data.roles.length}`, 'green');
    data.roles.forEach(role => {
      log(`   - ${role.displayName} (${role.name})${role.isSystem ? ' [System]' : ''}`, 'green');
    });
    return true;
  } else {
    log('❌ Failed to fetch roles', 'red');
    return false;
  }
}

// Test 3: Get role statistics
async function testGetRoleStats() {
  log('\n📝 Test 3: Get role statistics', 'blue');
  
  const { status, data } = await makeRequest('/roles/stats');

  if (status === 200 && data.stats) {
    log('✅ Role stats fetched successfully', 'green');
    data.stats.forEach(stat => {
      log(`   - ${stat.roleName}: ${stat.userCount} users${stat.isSystem ? ' [System]' : ''}`, 'green');
    });
    return true;
  } else {
    log('❌ Failed to fetch role stats', 'red');
    return false;
  }
}

// Test 4: Create custom role
async function testCreateRole() {
  log('\n📝 Test 4: Create custom role', 'blue');
  
  const newRole = {
    name: 'SALES_MANAGER',
    displayName: 'Sales Manager',
    description: 'Manages sales team and invoices',
    permissions: [
      {
        module: 'CLIENTS',
        actions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          export: true,
          print: true,
          share: false,
          approve: false,
        },
      },
      {
        module: 'TAX_INVOICE',
        actions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          export: true,
          print: true,
          share: true,
          approve: true,
        },
      },
      {
        module: 'QUOTATIONS',
        actions: {
          create: true,
          read: true,
          update: true,
          delete: true,
          export: true,
          print: true,
          share: true,
          approve: false,
        },
      },
    ],
    features: {
      canManageUsers: false,
      canManageRoles: false,
      canViewAllData: true,
      canExportData: true,
      canDeleteRecords: false,
      canApproveInvoices: true,
      canManageSettings: false,
      canAccessAPI: false,
    },
    restrictions: {
      ownDataOnly: false,
      departmentDataOnly: true,
      maxInvoiceAmount: 500000,
      maxDiscountPercent: 15,
      requiresApproval: false,
    },
  };

  const { status, data } = await makeRequest('/roles', 'POST', newRole);

  if (status === 201 && data.role) {
    testRoleId = data.role._id;
    log('✅ Role created successfully', 'green');
    log(`   Role ID: ${testRoleId}`, 'green');
    log(`   Name: ${data.role.displayName}`, 'green');
    log(`   Permissions: ${data.role.permissions.length} modules`, 'green');
    return true;
  } else {
    log('❌ Failed to create role', 'red');
    log(`   Error: ${data.error}`, 'red');
    return false;
  }
}

// Test 5: Get single role
async function testGetSingleRole() {
  log('\n📝 Test 5: Get single role', 'blue');
  
  if (!testRoleId) {
    log('⚠️  Skipped - No test role ID', 'yellow');
    return false;
  }

  const { status, data } = await makeRequest(`/roles/${testRoleId}`);

  if (status === 200 && data.role) {
    log('✅ Role fetched successfully', 'green');
    log(`   Name: ${data.role.displayName}`, 'green');
    log(`   Modules: ${data.role.permissions.length}`, 'green');
    log(`   Features:`, 'green');
    Object.entries(data.role.features).forEach(([key, value]) => {
      if (value) log(`     - ${key}: ${value}`, 'green');
    });
    return true;
  } else {
    log('❌ Failed to fetch role', 'red');
    return false;
  }
}

// Test 6: Update role
async function testUpdateRole() {
  log('\n📝 Test 6: Update role', 'blue');
  
  if (!testRoleId) {
    log('⚠️  Skipped - No test role ID', 'yellow');
    return false;
  }

  const updates = {
    description: 'Updated description for Sales Manager',
    features: {
      canExportData: true,
      canApproveInvoices: true,
      canViewAllData: true,
    },
  };

  const { status, data } = await makeRequest(`/roles/${testRoleId}`, 'PUT', updates);

  if (status === 200 && data.role) {
    log('✅ Role updated successfully', 'green');
    log(`   Description: ${data.role.description}`, 'green');
    return true;
  } else {
    log('❌ Failed to update role', 'red');
    return false;
  }
}

// Test 7: Clone role
async function testCloneRole() {
  log('\n📝 Test 7: Clone role', 'blue');
  
  if (!testRoleId) {
    log('⚠️  Skipped - No test role ID', 'yellow');
    return false;
  }

  const cloneData = {
    name: 'SALES_EXEC',
    displayName: 'Sales Executive',
  };

  const { status, data } = await makeRequest(`/roles/${testRoleId}/clone`, 'POST', cloneData);

  if (status === 201 && data.role) {
    log('✅ Role cloned successfully', 'green');
    log(`   New Role: ${data.role.displayName}`, 'green');
    log(`   Cloned ID: ${data.role._id}`, 'green');
    return true;
  } else {
    log('❌ Failed to clone role', 'red');
    log(`   Error: ${data.error}`, 'red');
    return false;
  }
}

// Test 8: Try to delete system role (should fail)
async function testDeleteSystemRole() {
  log('\n📝 Test 8: Try to delete system role (should fail)', 'blue');
  
  // Get OWNER role
  const { data: rolesData } = await makeRequest('/roles');
  const ownerRole = rolesData.roles.find(r => r.name === 'OWNER');

  if (!ownerRole) {
    log('⚠️  Skipped - OWNER role not found', 'yellow');
    return false;
  }

  const { status, data } = await makeRequest(`/roles/${ownerRole._id}`, 'DELETE');

  if (status === 403) {
    log('✅ System role protection working', 'green');
    log(`   Error: ${data.error}`, 'green');
    return true;
  } else {
    log('❌ System role was deleted (SECURITY ISSUE!)', 'red');
    return false;
  }
}

// Test 9: Delete custom role
async function testDeleteCustomRole() {
  log('\n📝 Test 9: Delete custom role', 'blue');
  
  if (!testRoleId) {
    log('⚠️  Skipped - No test role ID', 'yellow');
    return false;
  }

  const { status, data } = await makeRequest(`/roles/${testRoleId}`, 'DELETE');

  if (status === 200) {
    log('✅ Custom role deleted successfully', 'green');
    log(`   Message: ${data.message}`, 'green');
    return true;
  } else {
    log('❌ Failed to delete custom role', 'red');
    log(`   Error: ${data.error}`, 'red');
    return false;
  }
}

// Test 10: Verify user has role after login
async function testUserRoleAssignment() {
  log('\n📝 Test 10: Verify user role assignment', 'blue');
  
  const { status, data } = await makeRequest('/auth/me');

  if (status === 200 && data.user.role) {
    log('✅ User has role assigned', 'green');
    log(`   User: ${data.user.name}`, 'green');
    log(`   Role: ${data.user.role}`, 'green');
    log(`   Role Name: ${data.user.roleName}`, 'green');
    return true;
  } else {
    log('❌ User does not have role assigned', 'red');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  log('═══════════════════════════════════════════', 'blue');
  log('  Role Management API Test Suite', 'blue');
  log('═══════════════════════════════════════════', 'blue');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  const tests = [
    testLogin,
    testGetRoles,
    testGetRoleStats,
    testCreateRole,
    testGetSingleRole,
    testUpdateRole,
    testCloneRole,
    testDeleteSystemRole,
    testDeleteCustomRole,
    testUserRoleAssignment,
  ];

  for (const test of tests) {
    try {
      const result = await test();
      if (result === true) {
        results.passed++;
      } else if (result === false) {
        results.failed++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      log(`\n❌ Test failed with error: ${error.message}`, 'red');
      results.failed++;
    }
  }

  // Summary
  log('\n═══════════════════════════════════════════', 'blue');
  log('  Test Summary', 'blue');
  log('═══════════════════════════════════════════', 'blue');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'reset');
  log(`⚠️  Skipped: ${results.skipped}`, 'yellow');
  log(`📊 Total: ${results.passed + results.failed + results.skipped}`, 'blue');

  if (results.failed === 0) {
    log('\n🎉 All tests passed! Feature #52 is working correctly!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'red');
  }
}

// Execute
console.log('\n');
runAllTests().catch(console.error);